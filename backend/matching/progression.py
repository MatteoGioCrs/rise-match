"""
Module 6: Progression curve.
Linear regression on chronological performance history to detect trend.
"""

from datetime import date
from statistics import mean


def _linear_regression(xs: list[float], ys: list[float]) -> float:
    """Return slope of least-squares linear regression y = slope*x + intercept."""
    n = len(xs)
    if n < 2:
        return 0.0
    mx = mean(xs)
    my = mean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    den = sum((x - mx) ** 2 for x in xs)
    if den == 0:
        return 0.0
    return num / den


def compute_progression_score(performances: list[dict], event: str) -> dict:
    """
    Use last 3+ performances chronologically for this event.
    Compute linear regression slope on (index, time_seconds).
    Negative slope = improvement (times getting faster).
    slope < -0.5: score=90, slope < 0: score=65, slope >= 0: score=30
    Also compute delta over last 12 months.
    Returns {score, delta_12m_seconds, slope, trend}
    """
    event_perfs = [
        p for p in performances
        if p.get("event_code") == event and p.get("time_seconds") is not None
    ]

    # Sort chronologically
    def perf_date(p):
        d = p.get("date")
        if d is None:
            return date(2000, 1, 1)
        if isinstance(d, str):
            return date.fromisoformat(d)
        return d

    event_perfs.sort(key=perf_date)

    if len(event_perfs) < 2:
        return {
            "score": 50.0,
            "delta_12m_seconds": None,
            "slope": None,
            "trend": "insuffisant",
            "note": "Historique insuffisant (< 2 performances).",
        }

    times = [float(p["time_seconds"]) for p in event_perfs]
    xs = list(range(len(times)))
    slope = _linear_regression(xs, times)

    if slope < -0.5:
        score = 90.0
        trend = "improving"
    elif slope < 0:
        score = 65.0
        trend = "improving"
    else:
        score = 30.0
        trend = "plateau" if slope < 0.3 else "declining"

    # Delta over last 12 months
    today = date.today()
    perfs_12m = [
        p for p in event_perfs
        if (today - perf_date(p)).days <= 365
    ]
    delta_12m = None
    if len(perfs_12m) >= 2:
        delta_12m = round(float(perfs_12m[-1]["time_seconds"]) - float(perfs_12m[0]["time_seconds"]), 2)

    return {
        "score": round(score, 2),
        "delta_12m_seconds": delta_12m,
        "slope": round(slope, 4),
        "trend": trend,
    }


def estimate_potential(
    birth_date: date,
    event: str,
    current_pb_scy: float,
    height_cm: int,
    wingspan_cm: int,
) -> float:
    """
    Estimate SCY potential at peak age.
    Peak age: 21 for breaststroke, 22 for distance (800+), 20 otherwise.
    Heuristic: -0.8% per year remaining to peak, adjusted for height/wingspan.
    Returns estimated SCY time at peak.
    """
    today = date.today()
    age = (today - birth_date).days / 365.25

    if "BR" in event:
        peak_age = 21.0
    elif any(d in event for d in ["800", "1500"]):
        peak_age = 22.0
    else:
        peak_age = 20.0

    years_to_peak = max(0.0, peak_age - age)

    # Improvement rate base
    rate = 0.008 * years_to_peak  # 0.8% per year

    # Morpho bonus: wingspan > height suggests breaststroke/butterfly leverage
    if height_cm and wingspan_cm and wingspan_cm > height_cm:
        morpho_bonus = (wingspan_cm - height_cm) * 0.0001
        rate += morpho_bonus

    estimated = current_pb_scy * (1 - rate)
    return round(estimated, 2)
