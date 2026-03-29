"""
Module 2: Roster vacancy detection.
Identifies graduating seniors whose events overlap with the swimmer's specialties.
"""

VACANCY_CERTAINTY = 0.88  # post-COVID: no 5th year, redshirts rare in swimming


def compute_vacancy_score(
    swimmer_events: list[str],
    roster_seniors: list[dict],
) -> dict:
    """
    1. Collect all events vacated by departing seniors (study_year == 4)
    2. Find overlap with swimmer's events
    3. Score: 10 base if no overlap, up to 100 if multiple overlapping vacancies
    4. Apply VACANCY_CERTAINTY coefficient
    5. Return {score, seniors_leaving, events_vacating, events_covered, is_priority}

    is_priority = True when overlap >= 1 AND seniors_leaving >= 2
    """
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
        "events_covered": events_covered,
        "is_priority": is_priority,
        "certainty_applied": VACANCY_CERTAINTY,
    }
