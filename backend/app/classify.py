"""Turns a raw fetch outcome into a category + severity. Pure functions, easy to test."""
from dataclasses import dataclass

# Categories shown in the UI. "ok" means no issue is reported.
OK = "ok"
SUGGESTIONS = {
    "broken": "The target returns an error. Update the link, restore the page, or remove the link.",
    "server-error": "The target's server failed. Retry later; if it persists, check the server or replace the link.",
    "redirect": "The link redirects. Point it at the final URL to save a request.",
    "slow": "The target responds slowly. Compress or cache it, or lazy-load it.",
    "timeout": "No response in time. The host may be down or overloaded. Re-test before changing anything.",
    "dns": "The domain does not resolve. Check for a typo or an expired domain.",
    "connection": "A connection or TLS error occurred. Check the certificate and that the host is online.",
    "blocked": "The site refuses automated requests (401/403). Open it in a browser to confirm it works. Not counted against your score.",
    "rate-limited": "The site rate-limited the checker (429). Not counted against your score; re-scan later.",
    "image": "This image is missing. Re-upload it or fix the src/srcset path.",
}


@dataclass(frozen=True)
class Classification:
    category: str          # OK or one of SUGGESTIONS keys
    severity: str          # critical | warning | info
    counted: bool          # included in score denominator
    penalty_weight: float  # see scoring.py


def classify(status: int | None, error: str | None, hops: int, elapsed_ms: int, *, is_image: bool = False, slow_ms: int = 3000) -> Classification:
    """status: final HTTP status (None if no response). error: timeout|dns|connection|ssl|redirect_loop|too_many_redirects|unsafe."""
    if error == "timeout":
        return Classification("timeout", "warning", True, 0.5)
    if error == "dns":
        return Classification("dns", "critical", True, 1.0)
    if error in ("connection", "ssl", "redirect_loop", "too_many_redirects"):
        return Classification("connection", "critical", True, 1.0)
    if error == "unsafe":
        return Classification("blocked", "info", False, 0.0)
    if status is None:
        return Classification("connection", "critical", True, 1.0)
    if status == 429:
        return Classification("rate-limited", "info", False, 0.0)
    if status in (401, 403, 999):
        return Classification("blocked", "info", False, 0.0)
    if status >= 500:
        return Classification("server-error", "critical", True, 1.0)
    if status >= 400:
        return Classification("image" if is_image else "broken", "critical", True, 0.75 if is_image else 1.0)
    if hops >= 2:
        return Classification("redirect", "warning", True, 0.25)
    if hops == 1:
        return Classification("redirect", "info", True, 0.05)
    if elapsed_ms > slow_ms:
        return Classification("slow", "info", True, 0.0)
    return Classification(OK, "info", True, 0.0)
