import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .classify import SUGGESTIONS
from .db import Database
from .models import LinkIssue, ScanJob, ScanProgress, ScanRequest, ScanSummary
from .runner import ScanManager
from .security import DNSError, UnsafeURLError, validate_url


def job_from_row(r: dict) -> ScanJob:
    progress = None
    if r["status"] in ("queued", "running"):
        progress = ScanProgress(scan_id=r["id"], percent=r["percent"], current_url=r["current_url"], pages_scanned=r["pages_scanned"],
                                links_found=r["links_found"], links_checked=r["links_checked"], issues_found=r["issues_found"])
    summary = ScanSummary(**json.loads(r["summary"])) if r["summary"] else None
    return ScanJob(id=r["id"], url=r["url"], status=r["status"], started_at=r["started_at"], finished_at=r["finished_at"], error=r["error"], progress=progress, summary=summary)


def create_app(db_path: str | None = None, manager: ScanManager | None = None) -> FastAPI:
    db = Database(db_path)
    mgr = manager or ScanManager(db)
    mgr.db = db

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        await db.init()
        yield
        await mgr.shutdown()

    app = FastAPI(title="DeadLink Hunter API", version="0.2.0", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"], expose_headers=["X-Total-Count"])

    @app.get("/api/health")
    async def health():
        return {"status": "ok", "version": app.version}

    @app.post("/api/scans", response_model=ScanJob, status_code=202)
    async def create_scan(req: ScanRequest):
        try:
            await validate_url(req.url)
        except UnsafeURLError as exc:
            raise HTTPException(400, str(exc))
        except DNSError as exc:
            raise HTTPException(400, str(exc))
        scan_id = await mgr.submit(req)
        return job_from_row(await db.get_scan_row(scan_id))

    async def _row(scan_id: str) -> dict:
        row = await db.get_scan_row(scan_id)
        if not row:
            raise HTTPException(404, "Scan not found")
        return row

    @app.get("/api/scans", response_model=list[ScanJob])
    async def list_scans(limit: int = Query(100, ge=1, le=500)):
        return [job_from_row(r) for r in await db.list_scans(limit)]

    @app.get("/api/scans/{scan_id}", response_model=ScanJob)
    async def get_scan(scan_id: str):
        return job_from_row(await _row(scan_id))

    @app.get("/api/scans/{scan_id}/results", response_model=list[LinkIssue])
    async def results(scan_id: str, response: Response, category: str | None = None, severity: str | None = None,
                      kind: str | None = None, q: str | None = None, limit: int = Query(500, ge=1, le=2000), offset: int = Query(0, ge=0)):
        await _row(scan_id)
        rows, total = await db.query_issues(scan_id, category=category, severity=severity, kind=kind, q=q, limit=limit, offset=offset)
        response.headers["X-Total-Count"] = str(total)
        return [LinkIssue(id=str(r["id"]), scan_id=r["scan_id"], url=r["url"], source_page=r["source_page"], anchor_text=r["anchor_text"], kind=r["kind"],
                          status_code=r["status_code"], category=r["category"], severity=r["severity"], response_ms=r["response_ms"], message=r["message"],
                          suggestion=r["suggestion"], redirect_chain=json.loads(r["redirect_chain"]), checked_at=r["checked_at"]) for r in rows]

    @app.get("/api/scans/{scan_id}/summary", response_model=ScanSummary)
    async def summary(scan_id: str):
        row = await _row(scan_id)
        if not row["summary"]:
            raise HTTPException(409, f"Scan is {row['status']}; no summary available")
        return ScanSummary(**json.loads(row["summary"]))

    @app.get("/api/scans/{scan_id}/report")
    async def report(scan_id: str):
        row = await _row(scan_id)
        audits = await db.get_seo_audits(scan_id)
        if row["status"] in ("queued", "running"):
            raise HTTPException(409, f"Scan is {row['status']}; report is not ready")
        if not audits:
            raise HTTPException(404, "No SEO audit data is available for this scan")
        seo_score = round(sum(a["score"] for a in audits) / len(audits))
        check_counts = {"passed": 0, "issues": 0}
        for audit in audits:
            for check in audit["checks"]:
                check_counts["passed" if check["status"] == "passed" else "issues"] += 1
        summary_data = json.loads(row["summary"]) if row["summary"] else None
        return {
            "scanId": scan_id, "url": row["url"], "status": row["status"],
            "startedAt": row["started_at"], "finishedAt": row["finished_at"],
            "health": summary_data,
            "seo": {"score": seo_score, "pagesAudited": len(audits),
                    "checksPassed": check_counts["passed"], "checksWithIssues": check_counts["issues"],
                    "pages": audits},
        }

    @app.post("/api/scans/{scan_id}/cancel", response_model=ScanJob)
    async def cancel(scan_id: str):
        await _row(scan_id)
        await mgr.cancel(scan_id)
        return job_from_row(await _row(scan_id))

    return app


app = create_app()
