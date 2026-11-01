import json
from datetime import datetime, timezone

import aiosqlite

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY, url TEXT NOT NULL, status TEXT NOT NULL, options TEXT NOT NULL,
  started_at TEXT NOT NULL, finished_at TEXT, error TEXT,
  pages_scanned INTEGER DEFAULT 0, links_found INTEGER DEFAULT 0, links_checked INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0, percent INTEGER DEFAULT 0, current_url TEXT DEFAULT '', summary TEXT
);
CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT, scan_id TEXT NOT NULL, url TEXT, source_page TEXT, anchor_text TEXT,
  kind TEXT, category TEXT, severity TEXT, status_code INTEGER, response_ms INTEGER, message TEXT,
  suggestion TEXT, redirect_chain TEXT, checked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_issues_scan ON issues(scan_id, category);
CREATE TABLE IF NOT EXISTS seo_audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT, scan_id TEXT NOT NULL, page_url TEXT NOT NULL,
  score INTEGER NOT NULL, issues INTEGER NOT NULL, checks_json TEXT NOT NULL, checked_at TEXT NOT NULL,
  UNIQUE(scan_id, page_url)
);
CREATE INDEX IF NOT EXISTS idx_seo_scan ON seo_audits(scan_id);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Database:
    def __init__(self, path: str | None = None):
        self.path = path or config.DB_PATH

    def _conn(self):
        return aiosqlite.connect(self.path)

    async def init(self) -> None:
        async with self._conn() as db:
            await db.execute("PRAGMA journal_mode=WAL")
            await db.executescript(SCHEMA)
            await db.execute("UPDATE scans SET status='failed', error='Server restarted during scan', finished_at=? WHERE status IN ('queued','running')", (now(),))
            await db.commit()

    async def create_scan(self, scan_id: str, url: str, options: dict) -> None:
        async with self._conn() as db:
            await db.execute("INSERT INTO scans (id,url,status,options,started_at) VALUES (?,?,?,?,?)", (scan_id, url, "queued", json.dumps(options), now()))
            await db.commit()

    async def update_scan(self, scan_id: str, **fields) -> None:
        if "summary" in fields and fields["summary"] is not None:
            fields["summary"] = json.dumps(fields["summary"])
        cols = ", ".join(f"{k}=?" for k in fields)
        async with self._conn() as db:
            await db.execute(f"UPDATE scans SET {cols} WHERE id=?", (*fields.values(), scan_id))
            await db.commit()

    async def mark_finished(self, scan_id: str, status: str, error: str | None = None) -> None:
        """Never overwrite a terminal status (e.g. cancelled)."""
        async with self._conn() as db:
            await db.execute("UPDATE scans SET status=?, error=?, finished_at=? WHERE id=? AND status IN ('queued','running')", (status, error, now(), scan_id))
            await db.commit()

    async def add_issues(self, scan_id: str, rows: list[dict]) -> None:
        if not rows:
            return
        async with self._conn() as db:
            await db.executemany(
                "INSERT INTO issues (scan_id,url,source_page,anchor_text,kind,category,severity,status_code,response_ms,message,suggestion,redirect_chain,checked_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                [(scan_id, r["url"], r["source_page"], r["anchor_text"], r["kind"], r["category"], r["severity"], r["status_code"], r["response_ms"], r["message"], r["suggestion"], json.dumps(r["redirect_chain"]), now()) for r in rows],
            )
            await db.commit()


    async def add_seo_audit(self, scan_id: str, audit: dict) -> None:
        async with self._conn() as db:
            await db.execute(
                "INSERT OR REPLACE INTO seo_audits (scan_id,page_url,score,issues,checks_json,checked_at) VALUES (?,?,?,?,?,?)",
                (scan_id, audit["pageUrl"], audit["score"], audit["issues"], json.dumps(audit["checks"]), now()),
            )
            await db.commit()

    async def get_seo_audits(self, scan_id: str) -> list[dict]:
        async with self._conn() as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT * FROM seo_audits WHERE scan_id=? ORDER BY page_url", (scan_id,))
            rows = await cur.fetchall()
            return [{"pageUrl": r["page_url"], "score": r["score"], "issues": r["issues"],
                     "checks": json.loads(r["checks_json"]), "checkedAt": r["checked_at"]} for r in rows]

    async def get_scan_row(self, scan_id: str) -> dict | None:
        async with self._conn() as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT * FROM scans WHERE id=?", (scan_id,))
            row = await cur.fetchone()
            return dict(row) if row else None

    async def list_scans(self, limit: int = 100) -> list[dict]:
        async with self._conn() as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT * FROM scans ORDER BY started_at DESC LIMIT ?", (limit,))
            return [dict(r) for r in await cur.fetchall()]

    async def query_issues(self, scan_id: str, *, category=None, severity=None, kind=None, q=None, limit=500, offset=0) -> tuple[list[dict], int]:
        where, args = ["scan_id=?"], [scan_id]
        for col, val in (("category", category), ("severity", severity), ("kind", kind)):
            if val:
                where.append(f"{col}=?"); args.append(val)
        if q:
            where.append("(url LIKE ? OR source_page LIKE ? OR anchor_text LIKE ?)"); args += [f"%{q}%"] * 3
        clause = " AND ".join(where)
        async with self._conn() as db:
            db.row_factory = aiosqlite.Row
            total = (await (await db.execute(f"SELECT COUNT(*) FROM issues WHERE {clause}", args)).fetchone())[0]
            cur = await db.execute(f"SELECT * FROM issues WHERE {clause} ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, id LIMIT ? OFFSET ?", (*args, limit, offset))
            return [dict(r) for r in await cur.fetchall()], total
