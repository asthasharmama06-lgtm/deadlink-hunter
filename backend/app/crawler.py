"""Async crawl of one site: BFS over same-origin pages, links/images checked as they are discovered."""
import asyncio
import json
from collections import defaultdict
from dataclasses import dataclass
from urllib.parse import urljoin

import httpx

from . import config
from .checker import FetchResult, check_link, fetch, fetch_page
from .classify import OK, SUGGESTIONS, classify
from .db import Database
from .extractor import extract, same_origin
from .models import ScanRequest
from .scoring import FORMULA, health_score
from .seo import audit_page, add_site_checks


@dataclass
class Occurrence:
    source: str
    anchor: str
    kind: str


class ScanRun:
    def __init__(self, scan_id: str, req: ScanRequest, db: Database, client: httpx.AsyncClient):
        self.id, self.req, self.db, self.client = scan_id, req, db, client
        self.origin = req.url  # becomes the start page's final URL if it redirects (e.g. to www.)
        self.pages_scanned = 0
        self.current = req.url
        self.targets: dict[str, list[Occurrence]] = defaultdict(list)  # url -> where it was found
        self.results: dict[str, tuple[FetchResult, str]] = {}  # url -> (result, kind)
        self.in_flight: set[str] = set()
        self.queued_pages: set[str] = {req.url}
        self.crawled: set[str] = set()
        self.issues = 0
        self.tasks: set[asyncio.Task] = set()
        self.link_sem = asyncio.Semaphore(config.LINK_CONCURRENCY)
        self.page_sem = asyncio.Semaphore(config.PAGE_CONCURRENCY)
        self.pending_issues: list[dict] = []
        self.seo_audits: dict[str, dict] = {}

    # ---- bookkeeping -------------------------------------------------
    def percent(self) -> int:
        total = len(set(self.targets) | self.queued_pages)
        return min(99, int(100 * len(self.results) / total)) if total else 0

    async def flush(self, force: bool = False) -> None:
        rows, self.pending_issues = self.pending_issues, []
        await self.db.add_issues(self.id, rows)
        await self.db.update_scan(self.id, pages_scanned=self.pages_scanned, links_found=len(self.targets), links_checked=len(self.results),
                                  issues_found=self.issues, percent=self.percent(), current_url=self.current)

    def _emit(self, url: str, occ: Occurrence) -> None:
        res, kind = self.results[url]
        c = classify(res.status, res.error, res.hops, res.elapsed_ms, is_image=occ.kind == "image", slow_ms=self.req.slow_ms)
        if c.category == OK:
            return
        self.issues += 1
        self.pending_issues.append(dict(
            url=url, source_page=occ.source, anchor_text=occ.anchor, kind=occ.kind, category=c.category, severity=c.severity,
            status_code=res.status or 0, response_ms=res.elapsed_ms, message=res.message or f"HTTP {res.status}",
            suggestion=SUGGESTIONS[c.category], redirect_chain=res.chain + ([res.final_url] if res.chain else [])))

    # ---- link checking ----------------------------------------------
    def record(self, url: str, occ: Occurrence) -> bool:
        """Register an occurrence. Returns True when the URL still needs checking."""
        self.targets[url].append(occ)
        if url in self.results:
            self._emit(url, occ)
            return False
        return url not in self.in_flight

    def spawn_check(self, url: str, kind: str) -> None:
        self.in_flight.add(url)
        task = asyncio.create_task(self._check(url, kind))
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)

    async def _check(self, url: str, kind: str) -> None:
        try:
            async with self.link_sem:
                self.current = url
                res = await check_link(self.client, url)
        except Exception as exc:  # never lose a URL silently
            res = FetchResult(url=url, final_url=url, error="connection", message=f"Checker error: {exc}")
        self.store(url, res, kind)

    async def cancel_tasks(self) -> None:
        for t in list(self.tasks):
            t.cancel()
        await asyncio.gather(*list(self.tasks), return_exceptions=True)

    def store(self, url: str, res: FetchResult, kind: str) -> None:
        self.results[url] = (res, kind)
        self.in_flight.discard(url)
        for occ in self.targets[url]:
            self._emit(url, occ)

    # ---- crawl -------------------------------------------------------
    async def _page(self, url: str) -> tuple[str, FetchResult]:
        async with self.page_sem:
            self.current = url
            return url, await fetch_page(self.client, url)

    async def run(self) -> None:
        req = self.req
        level = [req.url]
        depth = 0
        while level and not (depth > req.max_depth):
            fetched = await asyncio.gather(*(self._page(u) for u in level))
            nxt: list[str] = []
            for url, res in fetched:
                if url != req.url and url not in self.results:
                    self.store(url, res, "link")  # internal pages are verified by crawling them
                if url == req.url:
                    self.results[url] = (res, "link")
                    self.origin = res.final_url or url
                    self.queued_pages.add(self.origin)
                    if res.error or (res.status or 0) >= 400:
                        # A start page that fails is reported as a failed scan by the runner
                        raise RuntimeError(res.message or f"Start page returned HTTP {res.status}")
                if not res.body:
                    continue  # error, redirect-only or non-HTML response: verified, not parsed
                final = res.final_url or url
                if final in self.crawled:
                    continue  # e.g. /old redirecting to an already-crawled page
                self.crawled.add(final)
                self.pages_scanned += 1
                html = res.body.decode("utf-8", errors="replace")
                origin_url = res.final_url or url
                audit = audit_page(html, origin_url)
                self.seo_audits[origin_url] = audit
                await self.db.add_seo_audit(self.id, audit)
                for f in extract(html, origin_url):
                    if f.kind == "image" and not req.check_images:
                        continue
                    internal = same_origin(f.url, self.origin)
                    if f.kind == "link" and not internal and not req.check_external:
                        continue
                    occ = Occurrence(url, f.anchor, f.kind)
                    if f.kind == "link" and internal and depth < req.max_depth and len(self.queued_pages) < req.max_pages and f.url not in self.queued_pages and f.url not in self.results:
                        self.queued_pages.add(f.url)
                        self.targets[f.url].append(occ)  # emitted when its page fetch resolves
                        nxt.append(f.url)
                        continue
                    if f.url in self.queued_pages:
                        self.targets[f.url].append(occ)
                        if f.url in self.results:
                            self._emit(f.url, occ)
                        continue
                    if self.record(f.url, occ):
                        self.spawn_check(f.url, f.kind)
                await self.flush()
            level = nxt
            depth += 1
        while self.tasks:
            await asyncio.gather(*list(self.tasks), return_exceptions=True)
            await self.flush()
        # Root-level technical SEO checks. fetch() validates every URL and redirect hop.
        root_audit = self.seo_audits.get(self.origin)
        if root_audit:
            robots = await fetch(self.client, urljoin(self.origin, "/robots.txt"), method="GET")
            sitemap_urls = [urljoin(self.origin, "/sitemap.xml"), urljoin(self.origin, "/sitemap_index.xml")]
            sitemap_ok = False
            for sitemap_url in sitemap_urls:
                result = await fetch(self.client, sitemap_url, method="GET")
                if result.status is not None and 200 <= result.status < 400 and not result.error:
                    sitemap_ok = True
                    break
            robots_ok = robots.status is not None and 200 <= robots.status < 400 and not robots.error
            updated = add_site_checks(root_audit, robots_ok, sitemap_ok)
            self.seo_audits[self.origin] = updated
            await self.db.add_seo_audit(self.id, updated)

        await self.flush()

    def summarize(self) -> dict:
        weighted, evaluated = 0.0, 0
        counts = defaultdict(int)
        for url, (res, kind) in self.results.items():
            c = classify(res.status, res.error, res.hops, res.elapsed_ms, is_image=kind == "image", slow_ms=self.req.slow_ms)
            if c.counted:
                evaluated += 1
                weighted += c.penalty_weight
            counts[c.category] += 1
        broken = sum(counts[k] for k in ("broken", "server-error", "dns", "connection"))
        summary = dict(
            totalLinks=len(self.results), healthy=counts[OK] + counts["slow"], broken=broken, redirects=counts["redirect"], slow=counts["slow"],
            healthScore=health_score(weighted, evaluated), pagesScanned=self.pages_scanned,
            imagesChecked=sum(1 for _, k in self.results.values() if k == "image"), brokenImages=counts["image"], timeouts=counts["timeout"],
            blocked=counts["blocked"], rateLimited=counts["rate-limited"],
            scoreBreakdown=dict(formula=FORMULA, evaluated=evaluated, weightedProblems=round(weighted, 2),
                                excludedBlocked=counts["blocked"], excludedRateLimited=counts["rate-limited"]))
        return summary
