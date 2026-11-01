import pytest
from app.classify import OK, classify
from app.scoring import health_score


@pytest.mark.parametrize("status,error,hops,ms,cat,counted", [
    (200, None, 0, 100, OK, True), (204, None, 0, 100, OK, True),
    (404, None, 0, 100, "broken", True), (410, None, 0, 100, "broken", True),
    (500, None, 0, 100, "server-error", True), (503, None, 0, 100, "server-error", True),
    (403, None, 0, 100, "blocked", False), (401, None, 0, 100, "blocked", False), (999, None, 0, 100, "blocked", False),
    (429, None, 0, 100, "rate-limited", False),
    (200, None, 1, 100, "redirect", True), (200, None, 3, 100, "redirect", True),
    (200, None, 0, 5000, "slow", True),
    (None, "timeout", 0, 10000, "timeout", True), (None, "dns", 0, 5, "dns", True),
    (None, "ssl", 0, 50, "connection", True), (None, "connection", 0, 50, "connection", True),
    (None, "redirect_loop", 1, 50, "connection", True), (None, "unsafe", 0, 1, "blocked", False),
])
def test_classification(status, error, hops, ms, cat, counted):
    c = classify(status, error, hops, ms)
    assert (c.category, c.counted) == (cat, counted)


def test_missing_image_and_redirect_severity():
    assert classify(404, None, 0, 10, is_image=True).category == "image"
    assert classify(200, None, 1, 10).severity == "info"
    assert classify(200, None, 2, 10).severity == "warning"


def test_blocked_and_rate_limited_never_penalised():
    for status in (401, 403, 429):
        c = classify(status, None, 0, 10)
        assert c.penalty_weight == 0 and not c.counted


def test_health_score():
    assert health_score(0, 0) == 100 and health_score(0, 200) == 100
    assert health_score(5, 100) == 80       # 5% broken -> -20
    assert health_score(25, 100) == 0       # clamped
    assert health_score(1, 240) == 98
