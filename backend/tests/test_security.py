import asyncio
import pytest
from app.security import DNSError, UnsafeURLError, validate_url


def ok(url):
    return asyncio.run(validate_url(url))


@pytest.mark.parametrize("url", [
    "ftp://example.test/a", "file:///etc/passwd", "javascript:alert(1)", "gopher://example.test",
    "http://", "http://user:pw@example.test/", "http://localhost/", "http://foo.localhost/", "http://x.internal/",
    "http://127.0.0.1/", "http://127.1.2.3:8080/", "http://10.1.2.3/", "http://192.168.0.10/", "http://172.16.5.5/",
    "http://169.254.169.254/latest/meta-data/", "http://metadata.google.internal/", "http://224.0.0.1/", "http://0.0.0.0/",
    "http://100.64.1.1/", "http://[::1]/", "http://[fe80::1]/", "http://[::ffff:127.0.0.1]/", "http://[fc00::1]/",
    "http://internal.test/", "http://rebind.test/",  # hostnames resolving to private IPs (any one bad IP blocks)
])
def test_blocked(url):
    with pytest.raises(UnsafeURLError):
        ok(url)


def test_public_urls_allowed():
    assert ok("https://example.test/path?q=1") == "https://example.test/path?q=1"
    assert ok("http://93.184.216.34/") == "http://93.184.216.34/"
    assert ok("http://example.test:8080/")


def test_unresolvable_host_is_dns_error():
    with pytest.raises(DNSError):
        ok("https://nope.test/")
