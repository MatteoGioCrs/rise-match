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
    height_cm: int = None,
    wingspan_cm: int = None,
    weight_kg: float = None,
    shoe_size_eu: int = None,
) -> dict:
    """
    Estimate SCY potential at peak age.
    Returns dict with potential_scy, potential_display, at_age, improvement_pct, morpho_factors.
    """
    from matching.conversion import seconds_to_display, get_stroke_from_event
    stroke = get_stroke_from_event(event)
    # Distance from event code
    dist = 100
    for d in [1500, 1650, 1000, 800, 500, 400, 200, 100, 50]:
        if str(d) in event:
            dist = d
            break

    # Peak age by event
    if dist <= 100 and stroke in ("FR", "BA", "FL"):
        peak_age = 21
    elif dist <= 200:
        peak_age = 22
    elif dist <= 400:
        peak_age = 23
    elif stroke == "BR":
        peak_age = 21
    else:
        peak_age = 24  # distance freestyle

    today = date.today()
    age = (today - birth_date).days / 365.25
    years_to_peak = max(0.0, peak_age - age)
    base_improvement = 0.008  # 0.8% per year

    morpho_bonus = 0.0
    morpho_factors: list[str] = []

    if height_cm:
        if stroke in ("FR", "BA") and height_cm >= 190:
            morpho_bonus += 0.005
            morpho_factors.append("Grande taille favorable")
        elif height_cm >= 185:
            morpho_bonus += 0.002

    if wingspan_cm and height_cm:
        if wingspan_cm > height_cm + 5:
            morpho_bonus += 0.004
            morpho_factors.append("Envergure favorable (+)")
        elif wingspan_cm > height_cm:
            morpho_bonus += 0.002

    if shoe_size_eu:
        if stroke in ("FR", "BA", "FL") and shoe_size_eu >= 46:
            morpho_bonus += 0.003
            morpho_factors.append("Grande pointure (propulsion)")
        elif shoe_size_eu >= 44:
            morpho_bonus += 0.001

    morpho_bonus = min(morpho_bonus, 0.015)
    total_improvement = base_improvement + morpho_bonus
    potential = current_pb_scy * ((1 - total_improvement) ** years_to_peak)
    pct = round(total_improvement * years_to_peak * 100, 1)

    return {
        "potential_scy": round(potential, 2),
        "potential_display": seconds_to_display(potential),
        "at_age": peak_age,
        "years_to_peak": round(years_to_peak, 1),
        "improvement_pct": pct,
        "morpho_factors": morpho_factors,
    }
