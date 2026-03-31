"""
Module 4: Relay value.
Any swimmer contributes to relays by their primary stroke:
  FR → 4×100 free, 4×200 free, medley free leg
  BA → medley back leg
  BR → medley breast leg
  FL → medley fly leg

Gap detection uses university_snapshot.best_times (live SwimCloud data)
or legacy roster_athletes list (backwards compat with engine.py).
"""

from typing import Optional
from .conversion import seconds_to_display

# Relay legs by stroke
STROKE_RELAY_MAP: dict[str, list[str]] = {
    "FR": ["4x100_free", "4x200_free", "medley_free"],
    "BA": ["medley_back"],
    "BR": ["medley_breast"],
    "FL": ["medley_fly"],
    "IM": [],  # no specific relay leg; can swim free in relays but not counted here
}

# Best event per stroke for relay assessment (priority order)
STROKE_EVENTS: dict[str, list[str]] = {
    "FR": ["100FR", "50FR", "200FR"],
    "BA": ["100BA", "200BA"],
    "BR": ["100BR", "200BR"],
    "FL": ["100FL", "200FL"],
}

# SCY benchmark below which a team has a "strong" specialist (8th-place estimate, D2 level)
RELAY_BENCHMARKS: dict[str, float] = {
    "100BR": 61.0,
    "100BA": 53.0,
    "100FL": 51.5,
    "100FR": 46.5,
    "200FR": 102.0,
    "50FR":  22.0,
    "200BA": 110.0,
    "200BR": 128.0,
    "200FL": 116.0,
}


def compute_relay_score(
    swimmer_scy_times: dict,
    roster_or_snapshot: "list[dict] | dict",
) -> dict:
    """
    Identify relay gaps and check if swimmer fills them.

    Parameters
    ----------
    swimmer_scy_times : dict   {event_code: seconds_float}
    roster_or_snapshot : list[dict] | dict
        • dict  → university_snapshot from fetch_university_snapshot()
        • list  → legacy roster_athletes list (backwards compat with engine.py)

    Score: 20 base + 25 per relay gap filled, max 100.
    """
    if isinstance(roster_or_snapshot, dict):
        return _from_snapshot(swimmer_scy_times, roster_or_snapshot)
    return _from_roster_list(swimmer_scy_times, roster_or_snapshot)


# ─── Snapshot path ────────────────────────────────────────────────────────────

def _from_snapshot(swimmer_scy_times: dict, snapshot: dict) -> dict:
    """Stroke-based relay contribution using best_times from snapshot."""
    team_best_times: dict[str, dict] = snapshot.get("best_times", {})
    relays_covered = []

    # Determine which strokes the swimmer has
    for stroke, relay_legs in STROKE_RELAY_MAP.items():
        if not relay_legs:
            continue

        # Find swimmer's best event for this stroke
        swimmer_event = _best_event_for_stroke(stroke, swimmer_scy_times)
        if swimmer_event is None:
            continue

        swimmer_time = swimmer_scy_times[swimmer_event]

        # Check 4×100 and 4×200 separately for freestyle
        if stroke == "FR":
            _add_free_relays(
                relays_covered, swimmer_scy_times, team_best_times
            )
        else:
            # Single relay leg (medley back/breast/fly)
            relay_name = relay_legs[0]
            key_event = STROKE_EVENTS[stroke][0]  # e.g. "100BA" for back
            gap = _team_has_gap(key_event, team_best_times)
            benchmark = RELAY_BENCHMARKS.get(key_event, 999)
            swimmer_is_competitive = swimmer_time <= benchmark * 1.10

            relays_covered.append({
                "relay": relay_name,
                "event": swimmer_event,
                "leg_time": seconds_to_display(swimmer_time),
                "gap_filled": gap and swimmer_is_competitive,
            })

    gaps_filled = sum(1 for r in relays_covered if r["gap_filled"])
    score = min(20.0 + gaps_filled * 25.0, 100.0)

    return {
        "score": round(score, 2),
        "relays_covered": relays_covered,
        "gaps_filled": gaps_filled,
    }


def _add_free_relays(
    out: list,
    swimmer_times: dict,
    team_best_times: dict,
) -> None:
    """Add 4×100 free, 4×200 free, and medley free leg entries."""
    # 4×100 free / medley free leg — use 100FR or estimate from 50FR
    t100 = swimmer_times.get("100FR") or (
        swimmer_times["50FR"] * 2.05 if "50FR" in swimmer_times else None
    )
    if t100 is not None:
        gap_4x100 = _team_has_gap("100FR", team_best_times)
        bm = RELAY_BENCHMARKS["100FR"]
        out.append({
            "relay": "4x100_free",
            "event": "100FR",
            "leg_time": seconds_to_display(t100),
            "gap_filled": gap_4x100 and t100 <= bm * 1.10,
        })
        out.append({
            "relay": "medley_free",
            "event": "100FR",
            "leg_time": seconds_to_display(t100),
            "gap_filled": gap_4x100 and t100 <= bm * 1.10,
        })

    # 4×200 free — need 200FR
    t200 = swimmer_times.get("200FR")
    if t200 is not None:
        gap_4x200 = _team_has_gap("200FR", team_best_times)
        bm = RELAY_BENCHMARKS["200FR"]
        out.append({
            "relay": "4x200_free",
            "event": "200FR",
            "leg_time": seconds_to_display(t200),
            "gap_filled": gap_4x200 and t200 <= bm * 1.10,
        })


def _team_has_gap(event: str, team_best_times: dict) -> bool:
    """
    Returns True if team has no listed time for this event
    OR their best time is above the benchmark (weak specialist).
    """
    entry = team_best_times.get(event)
    if not entry:
        return True  # no data → assume gap
    t = entry.get("time_seconds")
    if t is None:
        return True
    benchmark = RELAY_BENCHMARKS.get(event, 999)
    return float(t) > benchmark  # above benchmark → weak


def _best_event_for_stroke(stroke: str, swimmer_times: dict) -> Optional[str]:
    """Return swimmer's primary relay event for a given stroke."""
    for ev in STROKE_EVENTS.get(stroke, []):
        if ev in swimmer_times:
            return ev
    return None


# ─── Legacy list path (engine.py) ────────────────────────────────────────────

RELAY_LEG_MAP: dict[str, list[str]] = {
    "100BR": ["4x100_medley_breast"],
    "100BA": ["4x100_medley_back"],
    "100FL": ["4x100_medley_fly"],
    "100FR": ["4x100_medley_free", "4x100_free"],
    "200FR": ["4x200_free"],
    "50FR":  ["4x100_free"],
}


def _has_strong_specialist(event: str, roster_athletes: list[dict]) -> bool:
    benchmark = RELAY_BENCHMARKS.get(event)
    if benchmark is None:
        return True
    for athlete in roster_athletes:
        t = athlete.get("best_times", {}).get(event)
        if t is not None and float(t) <= benchmark:
            return True
    return False


def _from_roster_list(swimmer_scy_times: dict, roster_athletes: list[dict]) -> dict:
    """Original implementation for engine.py."""
    relays_covered = []

    for event, relays in RELAY_LEG_MAP.items():
        swimmer_time = swimmer_scy_times.get(event)
        if swimmer_time is None:
            continue

        gap_exists = not _has_strong_specialist(event, roster_athletes)
        benchmark = RELAY_BENCHMARKS.get(event, 999)
        swimmer_is_competitive = float(swimmer_time) <= benchmark * 1.05

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
