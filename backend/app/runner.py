import asyncio
import json
import uuid

from . import config
from .checker import build_client
from .crawler import ScanRun
from .db import Database
from .models import ScanRequest


class ScanManager:
    """Runs scans as in-process asyncio tasks. State lives in SQLite so the API stays stateless."""

    def __init__(self, db: Database, client_factory=build_client):
        self.db = db
        self.client_factory = client_factory
        self.tasks: dict[str, asyncio.Task] = {}
        self.sem = asyncio.Semaphore(config.MAX_CONCURRENT_SCANS)

    async def submit(self, req: ScanRequest) -> str:
        scan_id = uuid.uuid4().hex[:12]
        await self.db.create_scan(scan_id, req.url, req.model_dump())
        self.tasks[scan_id] = asyncio.create_task(self._run(scan_id, req))
        self.tasks[scan_id].add_done_callback(lambda _t, i=scan_id: self.tasks.pop(i, None))
        return scan_id

    async def _run(self, scan_id: str, req: ScanRequest) -> None:
        async with self.sem:
            row = await self.db.get_scan_row(scan_id)
            if not row or row["status"] != "queued":
                return  # cancelled while waiting
            await self.db.update_scan(scan_id, status="running")
            async with self.client_factory(req.timeout_ms / 1000) as client:
                run = ScanRun(scan_id, req, self.db, client)
                try:
                    await run.run()
                    await self.db.update_scan(scan_id, summary=run.summarize(), percent=100, pages_scanned=run.pages_scanned)
                    await self.db.mark_finished(scan_id, "completed")
                except asyncio.CancelledError:
                    await run.cancel_tasks()
                    await run.flush()
                    await self.db.mark_finished(scan_id, "cancelled")
                except Exception as exc:
                    await run.cancel_tasks()
                    await self.db.mark_finished(scan_id, "failed", str(exc)[:300])

    async def cancel(self, scan_id: str) -> bool:
        row = await self.db.get_scan_row(scan_id)
        if not row:
            raise KeyError(scan_id)
        if row["status"] not in ("queued", "running"):
            return False
        await self.db.mark_finished(scan_id, "cancelled")  # terminal status first: wins over the task's own update
        task = self.tasks.get(scan_id)
        if task:
            task.cancel()
        return True

    async def shutdown(self) -> None:
        for t in list(self.tasks.values()):
            t.cancel()
        await asyncio.gather(*self.tasks.values(), return_exceptions=True)
