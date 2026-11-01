"""Transparent health score.

    score = 100 - min(100, SENSITIVITY * 100 * weighted_problems / evaluated)

* evaluated = unique URLs checked, EXCLUDING blocked (401/403) and rate-limited (429) ones.
* weighted_problems = sum of per-URL weights (see classify.py):
    broken link / 5xx / DNS / connection error  1.00
    missing image                               0.75
    timeout                                     0.50   (may be transient)
    redirect chain of 2+ hops                   0.25
    single redirect                             0.05
    redirect loop / too many hops               1.00   (counted as connection error)
    slow, blocked, rate-limited                 0.00
* SENSITIVITY = 4, so 5% broken links costs 20 points and 25% costs everything.
"""
SENSITIVITY = 4
FORMULA = "score = 100 - min(100, 4 * 100 * weighted_problems / evaluated)"


def health_score(weighted: float, evaluated: int) -> int:
    if evaluated <= 0:
        return 100
    return max(0, min(100, round(100 - min(100.0, SENSITIVITY * 100 * weighted / evaluated))))
