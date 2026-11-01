"""Lightweight, explainable on-page and technical SEO checks."""
import re
from urllib.parse import urljoin, urlsplit
from bs4 import BeautifulSoup


def _check(key: str, label: str, ok: bool, points: int, details: str, recommendation: str = "") -> dict:
    return {
        "key": key, "label": label, "status": "passed" if ok else "issue",
        "points": points if ok else 0, "maxPoints": points,
        "details": details, "recommendation": "" if ok else recommendation,
    }


def audit_page(html: str, page_url: str) -> dict:
    """Return page-level SEO checks. This is an audit, not a Google ranking prediction."""
    soup = BeautifulSoup(html or "", "html.parser")
    checks: list[dict] = []

    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    checks.append(_check("title", "Page title", bool(title) and 30 <= len(title) <= 60, 15,
        f"Title length: {len(title)} characters." if title else "No title tag found.",
        "Add a unique, descriptive title of roughly 30–60 characters."))

    desc_tag = soup.find("meta", attrs={"name": lambda v: isinstance(v, str) and v.lower() == "description"})
    description = (desc_tag.get("content") or "").strip() if desc_tag else ""
    checks.append(_check("meta_description", "Meta description", bool(description) and 70 <= len(description) <= 160, 15,
        f"Description length: {len(description)} characters." if description else "No meta description found.",
        "Add a useful, page-specific meta description of roughly 70–160 characters."))

    h1s = soup.find_all("h1")
    checks.append(_check("h1", "H1 heading", len(h1s) == 1, 15,
        f"Found {len(h1s)} H1 heading(s).", "Use one clear, descriptive H1 heading for the page."))

    headings = [int(tag.name[1]) for tag in soup.find_all(re_compile_heading())]
    hierarchy_ok = bool(headings) and all(b - a <= 1 for a, b in zip(headings, headings[1:]))
    checks.append(_check("heading_structure", "Heading structure", hierarchy_ok, 10,
        "Heading levels follow a logical sequence." if hierarchy_ok else "No headings found or heading levels skip a level.",
        "Organize content with a logical H1–H2–H3 heading hierarchy."))

    canonical_tag = soup.find("link", rel=lambda v: v and "canonical" in ([x.lower() for x in v] if isinstance(v, list) else str(v).lower().split()))
    canonical = (canonical_tag.get("href") or "").strip() if canonical_tag else ""
    canonical_url = urljoin(page_url, canonical) if canonical else ""
    canonical_ok = bool(canonical_url) and urlsplit(canonical_url).scheme in ("http", "https")
    checks.append(_check("canonical", "Canonical URL", canonical_ok, 10,
        f"Canonical URL: {canonical_url}" if canonical_ok else "No valid canonical link found.",
        "Add a canonical link to the preferred URL for this page."))

    images = soup.find_all("img")
    missing_alt = sum(1 for img in images if not img.has_attr("alt"))
    image_ok = missing_alt == 0
    checks.append(_check("image_alt", "Image alternative text", image_ok, 10,
        f"{missing_alt} of {len(images)} image(s) are missing an alt attribute.",
        "Add meaningful alt text to informative images; use empty alt text only for decorative images."))

    viewport = soup.find("meta", attrs={"name": lambda v: isinstance(v, str) and v.lower() == "viewport"})
    checks.append(_check("viewport", "Mobile viewport", bool(viewport and viewport.get("content")), 5,
        "Viewport meta tag is present." if viewport else "Viewport meta tag is missing.",
        "Add a responsive viewport meta tag."))

    lang = (soup.html.get("lang") or "").strip() if soup.html else ""
    checks.append(_check("html_lang", "HTML language", bool(lang), 5,
        f"Document language: {lang}" if lang else "The HTML element has no lang attribute.",
        "Set the correct lang attribute on the HTML element."))

    https = urlsplit(page_url).scheme.lower() == "https"
    checks.append(_check("https", "HTTPS", https, 10,
        "Page uses HTTPS." if https else "Page URL uses HTTP, not HTTPS.",
        "Serve the website over HTTPS and redirect HTTP requests to HTTPS."))

    score = sum(c["points"] for c in checks)
    maximum = sum(c["maxPoints"] for c in checks)
    return {"pageUrl": page_url, "score": round(score * 100 / maximum) if maximum else 0,
            "checks": checks, "issues": sum(c["status"] == "issue" for c in checks)}


def re_compile_heading():
    return re.compile(r"^h[1-6]$")


def add_site_checks(audit: dict, robots_ok: bool, sitemap_ok: bool) -> dict:
    """Add root-site technical checks and normalize the score to 100 points."""
    checks = list(audit["checks"])
    checks.extend([
        _check("robots_txt", "Robots.txt", robots_ok, 5,
               "robots.txt was reachable." if robots_ok else "robots.txt was not found or could not be fetched.",
               "Publish a valid /robots.txt file with crawl directives."),
        _check("sitemap", "XML sitemap", sitemap_ok, 5,
               "An XML sitemap was reachable." if sitemap_ok else "No reachable sitemap.xml or sitemap index was found.",
               "Publish an XML sitemap and reference it in robots.txt."),
    ])
    # Page audit currently has 95 points; technical site checks add the remaining 10.
    # Re-scale proportionally so all pages use a consistent 100-point score.
    earned = sum(c["points"] for c in checks)
    possible = sum(c["maxPoints"] for c in checks)
    audit["checks"] = checks
    audit["score"] = round(earned * 100 / possible) if possible else 0
    audit["issues"] = sum(c["status"] == "issue" for c in checks)
    return audit
