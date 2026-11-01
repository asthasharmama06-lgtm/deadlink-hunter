import asyncio
import httpx
from app.checker import build_client, check_link


def run(handler, url):
    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler), follow_redirects=False) as c:
            return await check_link(c, url)
    return asyncio.run(go())


def test_head_405_falls_back_to_get():
    calls = []
    def h(req):
        calls.append(req.method)
        return httpx.Response(405 if req.method == "HEAD" else 200)
    r = run(h, "https://example.test/a")
    assert r.status == 200 and calls == ["HEAD", "GET"] and r.method == "GET"


def test_real_404_confirmed_with_get():
    r = run(lambda req: httpx.Response(404), "https://example.test/gone")
    assert r.status == 404


def test_429_not_retried():
    calls = []
    def h(req):
        calls.append(req.method); return httpx.Response(429)
    assert run(h, "https://example.test/").status == 429 and calls == ["HEAD"]


def test_redirect_chain_followed():
    def h(req):
        if req.url.path == "/a": return httpx.Response(301, headers={"location": "/b"})
        if req.url.path == "/b": return httpx.Response(302, headers={"location": "https://cdn.test/c"})
        return httpx.Response(200)
    r = run(h, "https://example.test/a")
    assert r.status == 200 and r.hops == 2 and r.final_url == "https://cdn.test/c"


def test_redirect_to_metadata_endpoint_is_blocked_before_fetching():
    seen = []
    def h(req):
        seen.append(str(req.url))
        return httpx.Response(302, headers={"location": "http://169.254.169.254/latest/meta-data/"})
    r = run(h, "https://example.test/")
    assert r.error == "unsafe" and seen == ["https://example.test/"]


def test_redirect_to_private_hostname_blocked():
    r = run(lambda req: httpx.Response(302, headers={"location": "http://internal.test/admin"}), "https://example.test/")
    assert r.error == "unsafe"


def test_redirect_loop_and_limit():
    assert run(lambda req: httpx.Response(302, headers={"location": str(req.url)}), "https://example.test/x").error == "redirect_loop"
    def chain(req):
        n = int(req.url.path.strip("/") or 0)
        return httpx.Response(302, headers={"location": f"/{n + 1}"})
    assert run(chain, "https://example.test/0").error == "too_many_redirects"


def test_timeout_and_dns_errors():
    def boom(req): raise httpx.ReadTimeout("slow")
    assert run(boom, "https://example.test/").error == "timeout"
    assert run(lambda r: httpx.Response(200), "https://nope.test/").error == "dns"
