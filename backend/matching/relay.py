"""
Module 4: Relay value.
Identifies relay legs where the roster has no strong specialist and checks
if the swimmer fills those gaps.
"""

from .conversion import seconds_to_display

RELAY_LEG_MAP: dict[str, list[str]] = {
    "100BR": ["4x100_medley_breast"],
    "100BA": ["4x100_medley_back"],
    "100FL": ["4x100_medley_fly"],
    "100FR": ["4x100_medley_free", "4x100_free"],
    "200FR": ["4x200_free"],
    "50FR":  ["4x100_free"],  # sprint relay leg estimate
}

# SCY benchmark times (in seconds) below which an athlete is considered "strong"
RELAY_BENCHMARKS: dict[str, float] = {
    "100BR": 61.0,   # ~1:01
    "100BA": 53.0,
    "100FL": 51.5,
    "100FR": 46.5,
    "200FR": 102.0,  # ~1:42
    "50FR":  22.0,
}


def _has_strong_specialist(event: str, roster_athletes: list[dict]) -> bool:
    """Return True if roster already has someone clearly strong in this event."""
    benchmark = RELAY_BENCHMARKS.get(event)
    if benchmark is None:
        return True  # unknown event — assume covered
    for athlete in roster_athletes:
        bt = athlete.get("best_times", {})
        t = bt.get(event)
        if t is not None and float(t) <= benchmark:
            return True
    return False


def compute_relay_score(
    swimmer_scy_times: dict,
    roster_athletes: list[dict],
) -> dict:
    """
    Identify relay legs where the roster has no strong specialist.
    Check if swimmer fills those gaps.
    Score: 20 base, +25 per relay gap covered, max 100.
    Returns {score, relays_covered: [{relay, leg_time, gap_filled}]}
    """
    relays_covered = []

    for event, relays in RELAY_LEG_MAP.items():
        swimmer_time = swimmer_scy_times.get(event)
        if swimmer_time is None:
            continue

        gap_exists = not _has_strong_specialist(event, roster_athletes)
        benchmark = RELAY_BENCHMARKS.get(event, 999)
        swimmer_is_competitive = float(swimmer_time) <= benchmark * 1.05  # within 5% of benchmark

        for relay in relays:
            relays_covered.append({
                "relay": relay,
                "event": event,
                "leg_time": seconds_to_display(float(swimmer_time)),
                "gap_filled": gap_exists and swimmer_is_competitive,
            })

    gaps_filled = sum(1 for r in relays_covered if r["gap_filled"])
    score = min(20.0 + gaps_filled * 25.0, 100.0)

    return {
        "score": round(score, 2),
        "relays_covered": relays_covered,
        "gaps_filled": gaps_filled,
    }
