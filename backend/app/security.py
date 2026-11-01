"""SSRF protection. Every URL is validated right before it is fetched, including each redirect hop."""
import asyncio
import ipaddress
import socket
from urllib.parse import urlsplit

from . import config

BLOCKED_HOSTNAMES = {"localhost", "metadata.google.internal", "metadata", "instance-data"}
BLOCKED_SUFFIXES = (".localhost", ".local", ".internal", ".localdomain")
CGNAT = ipaddress.ip_network("100.64.0.0/10")


class UnsafeURLError(ValueError):
    """URL is syntactically invalid or points somewhere we refuse to fetch."""


class DNSError(Exception):
    """Hostname does not resolve."""


def is_blocked_ip(ip: ipaddress._BaseAddress) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return (
        ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast
        or ip.is_reserved or ip.is_unspecified
        or (isinstance(ip, ipaddress.IPv4Address) and ip in CGNAT)
    )


async def _resolve(host: str, port: int) -> list[str]:
    loop = asyncio.get_running_loop()
    try:
        infos = await loop.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise DNSError(f"Could not resolve {host}") from exc
    return sorted({i[4][0] for i in infos})


def check_syntax(url: str) -> tuple[str, int]:
    """Return (hostname, port) or raise UnsafeURLError. No network access."""
    try:
        parts = urlsplit(url.strip())
        port = parts.port
    except ValueError as exc:
        raise UnsafeURLError("Malformed URL") from exc
    if parts.scheme.lower() not in ("http", "https"):
        raise UnsafeURLError("Only http:// and https:// URLs are allowed")
    host = (parts.hostname or "").rstrip(".").lower()
    if not host:
        raise UnsafeURLError("URL has no host")
    if parts.username or parts.password:
        raise UnsafeURLError("URLs with embedded credentials are not allowed")
    if not config.ALLOW_PRIVATE_HOSTS and (host in BLOCKED_HOSTNAMES or host.endswith(BLOCKED_SUFFIXES)):
        raise UnsafeURLError("This host is not allowed")
    return host, port or (443 if parts.scheme.lower() == "https" else 80)


async def validate_url(url: str) -> str:
    """Validate scheme/host and every resolved IP. Returns the URL unchanged when safe."""
    host, port = check_syntax(url)
    if config.ALLOW_PRIVATE_HOSTS:
        return url
    try:  # IP literal (also catches [::1])
        ips = [ipaddress.ip_address(host)]
    except ValueError:
        ips = [ipaddress.ip_address(a.split("%")[0]) for a in await _resolve(host, port)]
    if not ips:
        raise DNSError(f"Could not resolve {host}")
    for ip in ips:
        if is_blocked_ip(ip):
            raise UnsafeURLError("This address points to a private or reserved network and cannot be scanned")
    return url
