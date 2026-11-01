"""HTTP fetching with manual, SSRF-validated redirects and HEAD -> GET fallback."""
import asyncio
import ssl
import time
from dataclasses import dataclass, field
from urllib.parse import urljoin

import httpx

from . import config
from .security import DNSError, UnsafeURLError, validate_url

HEAD_FALLBACK_STATUSES = {400, 403, 404, 405, 406, 501}
REDIRECTS = {301, 302, 303, 307, 308}


@dataclass
class FetchResult:
    url: str
    status: int | None = None
    final_url: str = ""
    chain: list[str] = field(default_factory=list)  # intermediate URLs followed
    error: str | None = None
    message: str = ""
    elapsed_ms: int = 0
    method: str = "HEAD"
    body: bytes | None = None
    content_type: str = ""

    @property
    def hops(self) -> int:
        return len(self.chain)


def build_client(timeout_s: float) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        follow_redirects=False,  # we follow manually so every hop is validated
        timeout=httpx.Timeout(timeout_s, connect=min(timeout_s, 8.0)),
        headers={"User-Agent": config.USER_AGENT, "Accept": "*/*"},
        limits=httpx.Limits(max_connections=40, max_keepalive_connections=10),
    )


def _error_kind(exc: Exception) -> str:
    if isinstance(exc, httpx.TimeoutException):
        return "timeout"
    cause = exc.__cause__ or exc.__context__
    if isinstance(cause, ssl.SSLError) or "CERTIFICATE" in str(exc).upper() or "SSL" in str(exc).upper():
        return "ssl"
    return "connection"


async def _one(client: httpx.AsyncClient, method: str, url: str, read_body: bool) -> tuple[httpx.Response, bytes | None]:
    async with client.stream(method, url) as resp:
        body = None
        ctype = resp.headers.get("content-type", "").lower()
        if read_body and method == "GET" and resp.status_code < 300 and "html" in ctype:
            chunks, size = [], 0
            async for chunk in resp.aiter_bytes():
                chunks.append(chunk)
                size += len(chunk)
                if size >= config.MAX_PAGE_BYTES:
                    break
            body = b"".join(chunks)
        return resp, body


async def fetch(client: httpx.AsyncClient, url: str, *, method: str = "HEAD", read_body: bool = False) -> FetchResult:
    """Follow up to MAX_REDIRECTS hops. Each hop's URL is validated immediately before the request."""
    res = FetchResult(url=url, final_url=url, method=method)
    current, seen = url, {url}
    start = time.perf_counter()
    try:
        for _ in range(config.MAX_REDIRECTS + 1):
            await validate_url(current)
            resp, body = await _one(client, method, current, read_body)
            res.status, res.body = resp.status_code, body
            res.content_type = resp.headers.get("content-type", "")
            res.final_url = current
            loc = resp.headers.get("location")
            if resp.status_code in REDIRECTS and loc:
                nxt = urljoin(current, loc)
                if nxt in seen:
                    res.error, res.message = "redirect_loop", "Redirect loop"
                    break
                seen.add(nxt)
                res.chain.append(current)
                current = nxt
                continue
            break
        else:
            res.error, res.message = "too_many_redirects", f"More than {config.MAX_REDIRECTS} redirects"
    except UnsafeURLError as exc:
        res.error, res.message, res.status = "unsafe", str(exc), None
    except DNSError as exc:
        res.error, res.message, res.status = "dns", str(exc), None
    except httpx.HTTPError as exc:
        res.error, res.message, res.status = _error_kind(exc), str(exc) or type(exc).__name__, None
    res.elapsed_ms = int((time.perf_counter() - start) * 1000)
    return res


async def check_link(client: httpx.AsyncClient, url: str) -> FetchResult:
    """HEAD first (cheap). Servers that mishandle HEAD get one GET retry; GET bodies are never downloaded."""
    res = await fetch(client, url, method="HEAD")
    retry = (res.status in HEAD_FALLBACK_STATUSES) or res.error in ("connection", "ssl")
    if retry and res.error not in ("dns", "unsafe", "timeout"):
        res = await fetch(client, url, method="GET")
    return res


async def fetch_page(client: httpx.AsyncClient, url: str) -> FetchResult:
    return await fetch(client, url, method="GET", read_body=True)
