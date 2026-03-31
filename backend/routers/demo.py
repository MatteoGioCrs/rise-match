"""
Demo matching endpoint — no auth, no DB persistence.
Runs the full matching pipeline in memory against hardcoded university data.
"""

from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from matching.conversion import convert_to_scy, seconds_to_display
from matching.vacancy import compute_vacancy_score
from matching.conference import compute_conference_score
from matching.relay import compute_relay_score
from matching.academic import compute_academic_score
from matching.progression import compute_progression_score

router = APIRouter(prefix="/api/demo", tags=["demo"])

WEIGHTS = {
    "vacancy":    0.30,
    "conference": 0.20,
    "conversion": 0.20,
    "relay":      0.10,
    "academic":   0.15,
    "progress":   0.05,
}

# ─────────────────────────────────────────────────────────────────────────────
# Hardcoded university data for the demo
# ─────────────────────────────────────────────────────────────────────────────

DEMO_UNIVERSITIES = [
    {
        "id": 1,
        "name": "Drury University",
        "division": "D2",
        "conference": "GLVC",
        "city": "Springfield",
        "state": "MO",
        "country": "USA",
        "coach_email": "breynolds@drury.edu",
        "admission_rate": 0.72,
        "available_majors": [
            {"title": "Business Administration"},
            {"title": "Biology"},
            {"title": "Sport Science"},
            {"title": "Psychology"},
            {"title": "Computer Science"},
        ],
        "roster_seniors": [
            {"name": "Davi Mourao", "study_year": 4, "events": ["100BR", "200BR", "200IM"], "best_times": {"100BR": 56.1, "200BR": 122.0}},
            {"name": "Joao Nogueira", "study_year": 4, "events": ["100BR", "200BR"], "best_times": {"100BR": 56.8, "200BR": 123.5}},
            {"name": "Tyler Smith", "study_year": 4, "events": ["200FR", "400FR"], "best_times": {"200FR": 103.0}},
        ],
        "roster_all": [
            {"name": "Davi Mourao", "study_year": 4, "events": ["100BR", "200BR", "200IM"], "best_times": {"100BR": 56.1, "200BR": 122.0}},
            {"name": "Joao Nogueira", "study_year": 4, "events": ["100BR", "200BR"], "best_times": {"100BR": 56.8, "200BR": 123.5}},
            {"name": "Tyler Smith", "study_year": 4, "events": ["200FR", "400FR"], "best_times": {"200FR": 103.0}},
            {"name": "Marcus Webb", "study_year": 2, "events": ["100FR", "200FR"], "best_times": {"100FR": 47.1, "200FR": 103.5}},
            {"name": "Luis Torres", "study_year": 1, "events": ["100FL", "200IM"], "best_times": {"100FL": 52.0}},
        ],
        "conference_results": {
            "100BR": {"winning_time": 53.21, "cutoff_time": 56.50},
            "200BR": {"winning_time": 116.80, "cutoff_time": 123.00},
            "100FR": {"winning_time": 44.90, "cutoff_time": 47.80},
            "200FR": {"winning_time": 100.10, "cutoff_time": 106.00},
            "100BA": {"winning_time": 49.20, "cutoff_time": 52.50},
            "100FL": {"winning_time": 48.50, "cutoff_time": 52.00},
            "200IM": {"winning_time": 109.00, "cutoff_time": 117.50},
        },
    },
    {
        "id": 2,
        "name": "University of Michigan",
        "division": "D1",
        "conference": "Big Ten",
        "city": "Ann Arbor",
        "state": "MI",
        "country": "USA",
        "coach_email": "swimming@umich.edu",
        "admission_rate": 0.20,
        "available_majors": [
            {"title": "Engineering"},
            {"title": "Business"},
            {"title": "Computer Science"},
            {"title": "Biology"},
            {"title": "Psychology"},
        ],
        "roster_seniors": [
            {"name": "Jake Williams", "study_year": 4, "events": ["200FR", "400FR"], "best_times": {"200FR": 97.5}},
        ],
        "roster_all": [
            {"name": "Jake Williams", "study_year": 4, "events": ["200FR", "400FR"], "best_times": {"200FR": 97.5}},
            {"name": "Caio Pumputis", "study_year": 2, "events": ["100BR", "200BR"], "best_times": {"100BR": 50.2, "200BR": 109.5}},
            {"name": "Daniel Roy", "study_year": 3, "events": ["100FR", "200FR"], "best_times": {"100FR": 43.1}},
        ],
        "conference_results": {
            "100BR": {"winning_time": 49.30, "cutoff_time": 52.50},
            "200BR": {"winning_time": 108.20, "cutoff_time": 115.00},
            "100FR": {"winning_time": 41.80, "cutoff_time": 44.50},
            "200FR": {"winning_time": 93.00, "cutoff_time": 99.50},
            "100BA": {"winning_time": 44.80, "cutoff_time": 47.50},
            "100FL": {"winning_time": 44.50, "cutoff_time": 47.80},
            "200IM": {"winning_time": 101.00, "cutoff_time": 108.00},
        },
    },
    {
        "id": 3,
        "name": "Indiana University",
        "division": "D1",
        "conference": "Big Ten",
        "city": "Bloomington",
        "state": "IN",
        "country": "USA",
        "coach_email": "swim@iu.edu",
        "admission_rate": 0.80,
        "available_majors": [
            {"title": "Business"},
            {"title": "Sport Science"},
            {"title": "Biology"},
            {"title": "Communications"},
        ],
        "roster_seniors": [
            {"name": "Peter Larson", "study_year": 4, "events": ["100BR", "200BR"], "best_times": {"100BR": 51.5, "200BR": 112.0}},
            {"name": "Kyle Stevens", "study_year": 4, "events": ["200IM", "400IM"], "best_times": {"200IM": 109.0}},
        ],
        "roster_all": [
            {"name": "Peter Larson", "study_year": 4, "events": ["100BR", "200BR"], "best_times": {"100BR": 51.5, "200BR": 112.0}},
            {"name": "Kyle Stevens", "study_year": 4, "events": ["200IM", "400IM"], "best_times": {"200IM": 109.0}},
            {"name": "Alex Martin", "study_year": 2, "events": ["100FR", "50FR"], "best_times": {"100FR": 44.2}},
        ],
        "conference_results": {
            "100BR": {"winning_time": 49.30, "cutoff_time": 52.50},
            "200BR": {"winning_time": 108.20, "cutoff_time": 115.00},
            "100FR": {"winning_time": 41.80, "cutoff_time": 44.50},
            "200FR": {"winning_time": 93.00, "cutoff_time": 99.50},
            "200IM": {"winning_time": 101.00, "cutoff_time": 108.00},
        },
    },
    {
        "id": 4,
        "name": "University of Denver",
        "division": "D1",
        "conference": "Summit",
        "city": "Denver",
        "state": "CO",
        "country": "USA",
        "coach_email": "swim@du.edu",
        "admission_rate": 0.58,
        "available_majors": [
            {"title": "Business"},
            {"title": "Engineering"},
            {"title": "International Studies"},
            {"title": "Psychology"},
        ],
        "roster_seniors": [
            {"name": "Freddie Brown", "study_year": 4, "events": ["100BR"], "best_times": {"100BR": 53.1}},
        ],
        "roster_all": [
            {"name": "Freddie Brown", "study_year": 4, "events": ["100BR"], "best_times": {"100BR": 53.1}},
            {"name": "Colin Park", "study_year": 2, "events": ["200FR", "400FR"], "best_times": {"200FR": 102.5}},
        ],
        "conference_results": {
            "100BR": {"winning_time": 51.50, "cutoff_time": 55.00},
            "200BR": {"winning_time": 113.00, "cutoff_time": 120.50},
            "100FR": {"winning_time": 43.50, "cutoff_time": 46.50},
            "200FR": {"winning_time": 97.00, "cutoff_time": 103.50},
            "100FL": {"winning_time": 47.00, "cutoff_time": 50.50},
            "200IM": {"winning_time": 105.00, "cutoff_time": 113.00},
        },
    },
    {
        "id": 5,
        "name": "Auburn University",
        "division": "D1",
        "conference": "SEC",
        "city": "Auburn",
        "state": "AL",
        "country": "USA",
        "coach_email": "swim@auburn.edu",
        "admission_rate": 0.81,
        "available_majors": [
            {"title": "Engineering"},
            {"title": "Business"},
            {"title": "Biology"},
            {"title": "Communications"},
            {"title": "Sport Science"},
        ],
        "roster_seniors": [],
        "roster_all": [
            {"name": "Lars Granath", "study_year": 2, "events": ["100BR", "200BR"], "best_times": {"100BR": 49.8, "200BR": 108.5}},
            {"name": "Jack Saunderson", "study_year": 3, "events": ["100FR", "200FR"], "best_times": {"100FR": 42.3}},
        ],
        "conference_results": {
            "100BR": {"winning_time": 48.80, "cutoff_time": 51.80},
            "200BR": {"winning_time": 107.00, "cutoff_time": 114.00},
            "100FR": {"winning_time": 41.50, "cutoff_time": 44.00},
            "200FR": {"winning_time": 92.50, "cutoff_time": 98.50},
            "100BA": {"winning_time": 44.00, "cutoff_time": 47.00},
            "100FL": {"winning_time": 43.80, "cutoff_time": 47.20},
            "200IM": {"winning_time": 100.00, "cutoff_time": 107.00},
        },
    },
    {
        "id": 6,
        "name": "Missouri S&T",
        "division": "D2",
        "conference": "GLVC",
        "city": "Rolla",
        "state": "MO",
        "country": "USA",
        "coach_email": "swim@mst.edu",
        "admission_rate": 0.85,
        "available_majors": [
            {"title": "Engineering"},
            {"title": "Computer Science"},
            {"title": "Physics"},
            {"title": "Business"},
        ],
        "roster_seniors": [
            {"name": "Ryan Burke", "study_year": 4, "events": ["100FR", "200FR"], "best_times": {"100FR": 47.5, "200FR": 104.0}},
        ],
        "roster_all": [
            {"name": "Ryan Burke", "study_year": 4, "events": ["100FR", "200FR"], "best_times": {"100FR": 47.5, "200FR": 104.0}},
            {"name": "Tom Daley", "study_year": 2, "events": ["100BA", "200BA"], "best_times": {"100BA": 52.0}},
        ],
        "conference_results": {
            "100BR": {"winning_time": 53.21, "cutoff_time": 56.50},
            "200BR": {"winning_time": 116.80, "cutoff_time": 123.00},
            "100FR": {"winning_time": 44.90, "cutoff_time": 47.80},
            "200FR": {"winning_time": 100.10, "cutoff_time": 106.00},
        },
    },
    {
        "id": 7,
        "name": "Lewis University",
        "division": "D2",
        "conference": "GLVC",
        "city": "Romeoville",
        "state": "IL",
        "country": "USA",
        "coach_email": "swim@lewisu.edu",
        "admission_rate": 0.68,
        "available_majors": [
            {"title": "Business"},
            {"title": "Biology"},
            {"title": "Psychology"},
            {"title": "Education"},
        ],
        "roster_seniors": [
            {"name": "Marco DiSilva", "study_year": 4, "events": ["100BR", "200BR", "200IM"], "best_times": {"100BR": 57.0, "200BR": 124.5}},
        ],
        "roster_all": [
            {"name": "Marco DiSilva", "study_year": 4, "events": ["100BR", "200BR", "200IM"], "best_times": {"100BR": 57.0, "200BR": 124.5}},
            {"name": "Ben Carter", "study_year": 2, "events": ["100FR", "100FL"], "best_times": {"100FR": 47.8, "100FL": 52.5}},
        ],
        "conference_results": {
            "100BR": {"winning_time": 53.21, "cutoff_time": 56.50},
            "200BR": {"winning_time": 116.80, "cutoff_time": 123.00},
            "100FR": {"winning_time": 44.90, "cutoff_time": 47.80},
            "200IM": {"winning_time": 109.00, "cutoff_time": 117.50},
        },
    },
    {
        "id": 8,
        "name": "McKendree University",
        "division": "D2",
        "conference": "GLVC",
        "city": "Lebanon",
        "state": "IL",
        "country": "USA",
        "coach_email": "swim@mckendree.edu",
        "admission_rate": 0.62,
        "available_majors": [
            {"title": "Business"},
            {"title": "Sport Science"},
            {"title": "Biology"},
            {"title": "Psychology"},
        ],
        "roster_seniors": [
            {"name": "André Fontaine", "study_year": 4, "events": ["100BR", "200BR"], "best_times": {"100BR": 56.5, "200BR": 124.0}},
            {"name": "Lucas Fernandez", "study_year": 4, "events": ["100BR"], "best_times": {"100BR": 57.2}},
        ],
        "roster_all": [
            {"name": "André Fontaine", "study_year": 4, "events": ["100BR", "200BR"], "best_times": {"100BR": 56.5, "200BR": 124.0}},
            {"name": "Lucas Fernandez", "study_year": 4, "events": ["100BR"], "best_times": {"100BR": 57.2}},
            {"name": "Ethan Cruz", "study_year": 1, "events": ["200FR", "400FR"], "best_times": {"200FR": 106.5}},
        ],
        "conference_results": {
            "100BR": {"winning_time": 53.21, "cutoff_time": 56.50},
            "200BR": {"winning_time": 116.80, "cutoff_time": 123.00},
            "100FR": {"winning_time": 44.90, "cutoff_time": 47.80},
            "200IM": {"winning_time": 109.00, "cutoff_time": 117.50},
        },
    },
    {
        "id": 9,
        "name": "Truman State University",
        "division": "D2",
        "conference": "GLVC",
        "city": "Kirksville",
        "state": "MO",
        "country": "USA",
        "coach_email": "swim@truman.edu",
        "admission_rate": 0.61,
        "available_majors": [
            {"title": "Biology"},
            {"title": "Business"},
            {"title": "Communications"},
            {"title": "Computer Science"},
        ],
        "roster_seniors": [
            {"name": "Chris Wagner", "study_year": 4, "events": ["200FR", "400FR"], "best_times": {"200FR": 104.0}},
        ],
        "roster_all": [
            {"name": "Chris Wagner", "study_year": 4, "events": ["200FR", "400FR"], "best_times": {"200FR": 104.0}},
            {"name": "Aaron Hill", "study_year": 3, "events": ["100BA", "200BA"], "best_times": {"100BA": 53.0}},
        ],
        "conference_results": {
            "100BR": {"winning_time": 53.21, "cutoff_time": 56.50},
            "200BR": {"winning_time": 116.80, "cutoff_time": 123.00},
            "200FR": {"winning_time": 100.10, "cutoff_time": 106.00},
        },
    },
    {
        "id": 10,
        "name": "William Jewell College",
        "division": "D2",
        "conference": "GLVC",
        "city": "Liberty",
        "state": "MO",
        "country": "USA",
        "coach_email": "swim@jewell.edu",
        "admission_rate": 0.55,
        "available_majors": [
            {"title": "Biology"},
            {"title": "Business"},
            {"title": "Sport Science"},
            {"title": "Education"},
        ],
        "roster_seniors": [
            {"name": "Dylan Park", "study_year": 4, "events": ["100BR", "200BR"], "best_times": {"100BR": 57.5, "200BR": 125.0}},
        ],
        "roster_all": [
            {"name": "Dylan Park", "study_year": 4, "events": ["100BR", "200BR"], "best_times": {"100BR": 57.5, "200BR": 125.0}},
            {"name": "Sam Hughes", "study_year": 2, "events": ["200FR"], "best_times": {"200FR": 105.0}},
        ],
        "conference_results": {
            "100BR": {"winning_time": 53.21, "cutoff_time": 56.50},
            "200BR": {"winning_time": 116.80, "cutoff_time": 123.00},
            "200FR": {"winning_time": 100.10, "cutoff_time": 106.00},
            "200IM": {"winning_time": 109.00, "cutoff_time": 117.50},
        },
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────────────────────────────────────

class DemoMatchRequest(BaseModel):
    first_name: str
    last_name: str
    age: int
    gender: str  # 'M' or 'F'

    ffn_licence: Optional[str] = None

    event_100br_lcm: Optional[float] = None
    event_200br_lcm: Optional[float] = None
    event_100fr_lcm: Optional[float] = None
    event_200fr_lcm: Optional[float] = None
    event_100ba_lcm: Optional[float] = None
    event_100fl_lcm: Optional[float] = None
    event_200im_lcm: Optional[float] = None

    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    wingspan_cm: Optional[int] = None
    bac_mention: Optional[str] = None
    target_majors: Optional[list[str]] = None
    target_divisions: Optional[list[str]] = None


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _scholarship_est(fit_score: float) -> int:
    if fit_score >= 85:
        return 80
    if fit_score >= 70:
        return 60
    if fit_score >= 55:
        return 40
    if fit_score >= 40:
        return 20
    return 0


def _generate_email(
    first_name: str,
    last_name: str,
    age: int,
    uni: dict,
    swimmer_events: list[str],
    scy_times: dict,
    vacancy_detail: dict,
) -> tuple[str, str]:
    primary_event = swimmer_events[0] if swimmer_events else "natation"
    primary_scy = scy_times.get(primary_event)
    time_str = seconds_to_display(primary_scy) + " SCY" if primary_scy else ""

    subject = (
        f"Recruit {last_name.upper()} {first_name} — French {age}yo "
        f"{primary_event} {time_str}"
    )

    times_lines = "\n".join(
        f"  • {ev}: {seconds_to_display(t)} (SCY ≈)"
        for ev, t in scy_times.items()
    )

    seniors = vacancy_detail.get("seniors_leaving", [])
    vacancy_line = ""
    if seniors:
        events_vac = vacancy_detail.get("events_vacating", [])
        vacancy_line = (
            f"\nI noticed that {', '.join(seniors)} will be graduating this spring, "
            f"which may create an opening in {', '.join(events_vac) if events_vac else primary_event}.\n"
        )

    body = f"""Dear Coach,

My name is {first_name} {last_name}. I am a {age}-year-old French competitive swimmer and I am very interested in competing for {uni["name"]}.

My current best times (converted to SCY, approx. ±2%):
{times_lines}
{vacancy_line}
I am a dedicated student-athlete with strong academic results and am actively looking for an NCAA/NAIA program that would be a good mutual fit. I would love to learn more about your team, the academic programs available, and any scholarship opportunities.

Please feel free to reach out at your convenience. I look forward to hearing from you.

Best regards,
{first_name} {last_name}"""

    return subject, body


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/ffn-sync")
async def demo_ffn_sync(licence: str = Query(..., description="FFN licence number")):
    """Fetch LCM personal bests for a licence from FFN Extranat."""
    try:
        from scrapers.ffn_scraper import fetch_swimmer_perfs
        perfs = await fetch_swimmer_perfs(licence)
    except Exception as e:
        return {"ok": False, "error": f"Erreur FFN: {str(e)[:120]}"}

    if not perfs:
        return {"ok": False, "error": "Licence FFN non trouvée. Vérifie le numéro et réessaie."}

    # Best LCM time per event
    best: dict[str, float] = {}
    for p in perfs:
        if p.basin_type == "LCM" and p.time_seconds:
            ev = p.event_code
            if ev not in best or p.time_seconds < best[ev]:
                best[ev] = p.time_seconds

    if not best:
        return {"ok": False, "error": "Aucune performance 50m (LCM) trouvée pour cette licence."}

    # Map internal codes to request fields
    field_map = {
        "100BR": "event_100br_lcm",
        "200BR": "event_200br_lcm",
        "100FR": "event_100fr_lcm",
        "200FR": "event_200fr_lcm",
        "100BA": "event_100ba_lcm",
        "100FL": "event_100fl_lcm",
        "200IM": "event_200im_lcm",
    }
    times = {field_map[ev]: t for ev, t in best.items() if ev in field_map}
    times_display = {ev: seconds_to_display(t) for ev, t in best.items() if ev in field_map}

    return {"ok": True, "times": times, "times_display": times_display}


@router.post("/match")
async def demo_match(payload: DemoMatchRequest):
    """Full matching pipeline — no auth, no DB persistence."""

    # 1. Collect LCM times
    manual_map = {
        "100BR": payload.event_100br_lcm,
        "200BR": payload.event_200br_lcm,
        "100FR": payload.event_100fr_lcm,
        "200FR": payload.event_200fr_lcm,
        "100BA": payload.event_100ba_lcm,
        "100FL": payload.event_100fl_lcm,
        "200IM": payload.event_200im_lcm,
    }

    times_lcm: dict[str, float] = {}
    times_source = "Manuel"
    ffn_error: Optional[str] = None

    # 2. FFN sync if licence provided
    if payload.ffn_licence:
        try:
            from scrapers.ffn_scraper import fetch_swimmer_perfs
            perfs = await fetch_swimmer_perfs(payload.ffn_licence)
            for p in perfs:
                if p.basin_type == "LCM" and p.event_code in manual_map and p.time_seconds:
                    if p.event_code not in times_lcm or p.time_seconds < times_lcm[p.event_code]:
                        times_lcm[p.event_code] = p.time_seconds
            if times_lcm:
                times_source = "FFN Extranat"
            else:
                ffn_error = "Aucune performance LCM trouvée pour cette licence."
        except Exception as e:
            ffn_error = f"Erreur FFN: {str(e)[:100]}"

    # Fall back to manual times
    if not times_lcm:
        for ev, t in manual_map.items():
            if t is not None and t > 0:
                times_lcm[ev] = t

    if not times_lcm:
        return {
            "error": "Aucun temps fourni. Entre au moins un temps ou une licence FFN valide.",
            "swimmer": None,
            "matches": [],
        }

    # 3. Convert LCM → SCY
    scy_times: dict[str, float] = {}
    conversion_details: dict[str, dict] = {}
    for ev, t in times_lcm.items():
        result = convert_to_scy(ev, "LCM", t)
        scy_times[ev] = result["scy_seconds"]
        conversion_details[ev] = result

    avg_confidence = (
        sum(d["confidence"] for d in conversion_details.values()) / len(conversion_details)
        if conversion_details else 0.8
    )
    score_conversion = round(avg_confidence * 100, 2)

    swimmer_events = list(scy_times.keys())

    # Minimal perf list (single data point — progression will return 50)
    perf_dicts = [
        {
            "event_code": ev,
            "basin_type": "LCM",
            "time_seconds": t,
            "time_raw": seconds_to_display(t),
            "date": None,
            "is_pb": True,
        }
        for ev, t in times_lcm.items()
    ]

    times_lcm_display = {ev: seconds_to_display(t) for ev, t in times_lcm.items()}
    times_scy_display = {ev: seconds_to_display(t) for ev, t in scy_times.items()}

    # 4. Run matching against each demo university
    matches = []
    for uni in DEMO_UNIVERSITIES:
        roster_seniors = uni["roster_seniors"]
        roster_all = uni["roster_all"]

        # Vacancy
        vacancy_result = compute_vacancy_score(swimmer_events, roster_seniors)
        score_vacancy = vacancy_result["score"]

        # Conference — best event score
        conf_results = uni["conference_results"]
        best_conf_score = 0.0
        for ev in swimmer_events:
            if ev in scy_times and ev in conf_results:
                c = compute_conference_score(scy_times[ev], ev, conf_results[ev])
                if c["score"] > best_conf_score:
                    best_conf_score = c["score"]
        score_conf = best_conf_score if best_conf_score > 0 else 40.0

        # Relay
        relay_result = compute_relay_score(scy_times, roster_all)
        score_relay = relay_result["score"]

        # Academic
        academic_result = compute_academic_score(
            target_majors=payload.target_majors or [],
            bac_mention=payload.bac_mention,
            available_majors=uni["available_majors"],
            admission_rate=uni["admission_rate"],
        )
        score_academic = academic_result["score"]

        # Progression (single data point → 50)
        primary_event = swimmer_events[0] if swimmer_events else None
        if primary_event:
            prog_result = compute_progression_score(perf_dicts, primary_event)
        else:
            prog_result = {"score": 50.0, "trend": "insuffisant", "delta_12m_seconds": None, "slope": None}
        score_progress = prog_result["score"]

        # Weighted fit score
        fit_score = (
            WEIGHTS["vacancy"]    * score_vacancy +
            WEIGHTS["conference"] * score_conf +
            WEIGHTS["conversion"] * score_conversion +
            WEIGHTS["relay"]      * score_relay +
            WEIGHTS["academic"]   * score_academic +
            WEIGHTS["progress"]   * score_progress
        )
        fit_score = round(fit_score, 1)

        subject, body = _generate_email(
            payload.first_name, payload.last_name, payload.age,
            uni, swimmer_events, scy_times, vacancy_result,
        )

        matches.append({
            "university": uni["name"],
            "division": uni["division"],
            "conference": uni["conference"],
            "location": f"{uni['city']}, {uni['state']}",
            "country": uni["country"],
            "fit_score": fit_score,
            "scholarship_est": _scholarship_est(fit_score),
            "scores": {
                "vacancy": round(score_vacancy, 1),
                "conference": round(score_conf, 1),
                "conversion": round(score_conversion, 1),
                "relay": round(score_relay, 1),
                "academic": round(score_academic, 1),
                "progression": round(score_progress, 1),
            },
            "vacancy_detail": {
                "is_priority": vacancy_result["is_priority"],
                "seniors_leaving": vacancy_result["seniors_leaving"],
                "events_vacating": vacancy_result["events_vacating"],
            },
            "coach_email": uni["coach_email"],
            "email_subject": subject,
            "email_body": body,
        })

    matches.sort(key=lambda m: m["fit_score"], reverse=True)
    for i, m in enumerate(matches):
        m["rank"] = i + 1

    return {
        "swimmer": {
            "name": f"{payload.first_name} {payload.last_name}",
            "age": payload.age,
            "times_lcm": times_lcm_display,
            "times_scy": times_scy_display,
            "source": times_source,
            "ffn_error": ffn_error,
        },
        "matches": matches,
    }
