"""
Module 3: Conference score.
Compares swimmer's converted SCY time against last conference championship results.
8th place is assumed to be the last scoring position in NCAA conferences.
"""

from .conversion import seconds_to_display


def compute_conference_score(
    swimmer_scy: float,
    event: str,
    conference_results: dict,
) -> dict:
    """
    Compare swimmer SCY time vs last conference championship results.
    - swimmer <= winning_time: score = 100
    - winning_time < swimmer <= cutoff_time: interpolate 100→60
    - swimmer > cutoff_time: degrade based on gap ratio, minimum 10

    Returns {score, winner_time_display, cutoff_time_display, would_score, est_points}
    """
    winning_time = conference_results.get("winning_time")
    cutoff_time = conference_results.get("cutoff_time")

    if not winning_time or not cutoff_time:
        return {
            "score": 50.0,
            "winner_time_display": "N/A",
            "cutoff_time_display": "N/A",
            "would_score": None,
            "est_points": 0,
            "note": "Résultats de conférence indisponibles pour cette épreuve.",
        }

    winning_time = float(winning_time)
    cutoff_time = float(cutoff_time)

    if swimmer_scy <= winning_time:
        score = 100.0
        would_score = True
        est_points = 20  # 1st place in NCAA scoring = 20 pts
    elif swimmer_scy <= cutoff_time:
        # Linear interpolation 100 → 60 between winning and cutoff
        ratio = (swimmer_scy - winning_time) / (cutoff_time - winning_time)
        score = 100.0 - ratio * 40.0
        would_score = True
        # Estimate points: 1st=20, 8th=3 (NCAA individual scoring scale)
        est_points = max(3, round(20 - ratio * 17))
    else:
        # Beyond cutoff: degrade based on gap ratio
        gap_ratio = (swimmer_scy - cutoff_time) / cutoff_time
        score = max(10.0, 60.0 - gap_ratio * 500)
        would_score = False
        est_points = 0

    return {
        "score": round(score, 2),
        "winner_time_display": seconds_to_display(winning_time),
        "cutoff_time_display": seconds_to_display(cutoff_time),
        "would_score": would_score,
        "est_points": est_points,
    }
