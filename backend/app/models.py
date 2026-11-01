from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

ScanStatus = Literal["queued", "running", "completed", "failed", "cancelled"]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ScanRequest(CamelModel):
    url: str = Field(min_length=4, max_length=2048)
    max_pages: int = Field(default=50, ge=1, le=200)
    max_depth: int = Field(default=3, ge=0, le=10)
    check_external: bool = True
    check_images: bool = True
    timeout_ms: int = Field(default=10_000, ge=1000, le=30_000)
    slow_ms: int = Field(default=3000, ge=200, le=30_000)


class ScanProgress(CamelModel):
    scan_id: str
    percent: int
    current_url: str
    pages_scanned: int
    links_found: int
    links_checked: int
    issues_found: int


class ScoreBreakdown(CamelModel):
    formula: str
    evaluated: int
    weighted_problems: float
    excluded_blocked: int
    excluded_rate_limited: int


class ScanSummary(CamelModel):
    total_links: int
    healthy: int
    broken: int
    redirects: int
    slow: int
    health_score: int
    pages_scanned: int
    images_checked: int
    broken_images: int
    timeouts: int
    blocked: int
    rate_limited: int
    score_breakdown: ScoreBreakdown


class ScanJob(CamelModel):
    id: str
    url: str
    status: ScanStatus
    started_at: str
    finished_at: str | None = None
    error: str | None = None
    progress: ScanProgress | None = None
    summary: ScanSummary | None = None


class LinkIssue(CamelModel):
    id: str
    scan_id: str
    url: str
    source_page: str
    anchor_text: str
    kind: Literal["link", "image"]
    status_code: int
    category: str
    severity: Literal["critical", "warning", "info"]
    response_ms: int
    message: str
    suggestion: str
    redirect_chain: list[str]
    checked_at: str
