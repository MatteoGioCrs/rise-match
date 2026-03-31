"""
Module 2: Roster vacancy detection.
Identifies events with departing athletes that overlap with the swimmer's specialties.

Accepts either a university_snapshot dict (new path, from SwimCloud fetch)
or a legacy list of roster athletes (backwards-compatible with engine.py).
"""

VACANCY_CERTAINTY = 0.88  # post-COVID: no 5th year, redshirts rare in swimming


def compute_vacancy_score(
    swimmer_events: list[str],
    roster_or_snapshot: "list[dict] | dict",
) -> dict:
    """
    Score vacancy fit.

    Parameters
    ----------
    swimmer_events : list[str]  Event codes the swimmer competes in, e.g. ['100BR', '200BR']
    roster_or_snapshot : list[dict] | dict
        • dict  → university_snapshot from fetch_university_snapshot()
          Keys used: departing_athletes, departing_events
        • list  → legacy roster_seniors list (backwards compat with engine.py)

    Returns
    -------
    dict with: score, seniors_leaving, events_vacating, events_vacating_top,
               events_covered, is_priority, certainty_applied
    """
    if isinstance(roster_or_snapshot, dict):
        return _from_snapshot(swimmer_events, roster_or_snapshot)
    return _from_roster_list(swimmer_events, roster_or_snapshot)


# ─── Snapshot path ────────────────────────────────────────────────────────────

def _from_snapshot(swimmer_events: list[str], snapshot: dict) -> dict:
    """Use university_snapshot with departing_athletes and departing_events."""
    departing = snapshot.get("departing_athletes", [])
    # Events where the top (fastest) athlete on the team is departing — highest value
    departing_events_top: set[str] = set(snapshot.get("departing_events", []))

    # All events vacated by ANY departing athlete (broader net)
    events_vacating_any: set[str] = set()
    for a in departing:
        for ev in a.get("events", []):
            events_vacating_any.add(ev)

    seniors_leaving = [a.get("name") for a in departing if a.get("study_year") == 4]
    n_departing = len(departing)

    overlap_top = [ev for ev in swimmer_events if ev in departing_events_top]
    overlap_mid = [
        ev for ev in swimmer_events
        if ev in events_vacating_any and ev not in departing_events_top
    ]
    overlap_count = len(overlap_top) + len(overlap_mid)

    if overlap_count == 0:
        raw_score = 10.0
    else:
        raw_score = (
            10.0
            + len(overlap_top) * 35
            + len(overlap_mid) * 15
            + min(n_departing * 5, 15)
        )

    score = round(min(raw_score * VACANCY_CERTAINTY, 100.0), 2)
    is_priority = len(overlap_top) >= 1 and n_departing >= 2

    return {
        "score": score,
        "seniors_leaving": seniors_leaving,
        "events_vacating": list(events_vacating_any),
        "events_vacating_top": list(departing_events_top),
        "events_covered": overlap_top + overlap_mid,
        "is_priority": is_priority,
        "certainty_applied": VACANCY_CERTAINTY,
    }


# ─── Legacy list path (engine.py) ────────────────────────────────────────────

def _from_roster_list(swimmer_events: list[str], roster_seniors: list[dict]) -> dict:
    """Original implementation for engine.py which passes a roster_seniors list."""
    seniors_leaving = [a for a in roster_seniors if a.get("study_year") == 4]
    events_vacating: list[str] = []

    for senior in seniors_leaving:
        for ev in senior.get("events", []):
            if ev not in events_vacating:
                events_vacating.append(ev)

    events_covered = [ev for ev in swimmer_events if ev in events_vacating]
    overlap_count = len(events_covered)
    n_seniors = len(seniors_leaving)

    if overlap_count == 0:
        raw_score = 10.0
    elif overlap_count == 1:
        raw_score = 55.0 + min(n_seniors * 10, 20)
    else:
        raw_score = 70.0 + min((overlap_count - 1) * 10 + n_seniors * 5, 30)

    score = round(min(raw_score * VACANCY_CERTAINTY, 100.0), 2)
    is_priority = overlap_count >= 1 and n_seniors >= 2

    return {
        "score": score,
        "seniors_leaving": [s.get("name") for s in seniors_leaving],
        "events_vacating": events_vacating,
        "events_vacating_top": [],
        "events_covered": events_covered,
        "is_priority": is_priority,
        "certainty_applied": VACANCY_CERTAINTY,
    }
