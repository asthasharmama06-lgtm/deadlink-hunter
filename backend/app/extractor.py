import re
from dataclasses import dataclass
from urllib.parse import urldefrag, urljoin, urlsplit

from bs4 import BeautifulSoup

SKIP_SCHEMES = ("mailto:", "tel:", "javascript:", "data:", "sms:", "blob:", "about:", "ftp:", "file:")


@dataclass(frozen=True)
class Found:
    url: str
    kind: str  # "link" | "image"
    anchor: str
    tag: str


def normalize(raw: str | None, base: str) -> str | None:
    """Resolve against base, drop fragments, keep only http(s). Returns None when not checkable."""
    if not raw:
        return None
    raw = raw.strip()
    if not raw or raw.startswith("#") or raw.lower().startswith(SKIP_SCHEMES):
        return None
    try:
        url, _ = urldefrag(urljoin(base, raw))
        parts = urlsplit(url)
    except ValueError:
        return None
    if parts.scheme not in ("http", "https") or not parts.netloc:
        return None
    return url


def parse_srcset(value: str) -> list[str]:
    urls = []
    for part in re.split(r",\s+|,$", value.strip()):
        token = part.strip().split(" ")[0].strip()
        if token and not token.startswith("data:"):
            urls.append(token.rstrip(","))
    return urls


def extract(html: str, page_url: str) -> list[Found]:
    soup = BeautifulSoup(html, "html.parser")
    base_tag = soup.find("base", href=True)
    base = urljoin(page_url, base_tag["href"]) if base_tag else page_url
    seen: set[tuple[str, str]] = set()
    out: list[Found] = []

    def add(raw: str | None, kind: str, anchor: str, tag: str) -> None:
        url = normalize(raw, base)
        if url and (url, kind) not in seen:
            seen.add((url, kind))
            out.append(Found(url, kind, anchor.strip()[:120], tag))

    for a in soup.find_all("a", href=True):
        text = a.get_text(" ", strip=True) or (a.find("img") or {}).get("alt", "") or a.get("title", "")
        add(a["href"], "link", text, "a")
    for img in soup.find_all("img"):
        alt = img.get("alt", "")
        add(img.get("src") or img.get("data-src"), "image", alt, "img")
        for u in parse_srcset(img.get("srcset", "")):
            add(u, "image", alt, "img")
    for src in soup.find_all("source"):
        if src.parent and src.parent.name in ("video", "audio"):
            continue  # only picture/<source> images are checked
        add(src.get("src"), "image", "", "source")
        for u in parse_srcset(src.get("srcset", "")):
            add(u, "image", "", "source")
    return out


def same_origin(a: str, b: str) -> bool:
    """Same host and port. http and https on the same host count as one site."""
    def key(url: str):
        p = urlsplit(url)
        return (p.hostname or "").lower(), (None if p.port in (None, 80, 443) else p.port)
    return key(a) == key(b)
