"""
Demo matching endpoint — no auth, no DB persistence.
Runs the full matching pipeline in memory.
Tries live SwimCloud data (season 2025-26); falls back to division-based estimates.
"""

import asyncio
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from matching.conversion import convert_to_scy, seconds_to_display, get_stroke_from_event
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
# Division-level fallback cutoffs (8th place = conference scoring estimate, SCY)
# ─────────────────────────────────────────────────────────────────────────────

DIVISION_CUTOFFS: dict[str, dict[str, float]] = {
    "100BR": {"D1_power": 52.5, "D1_mid": 54.5, "D2": 56.5, "NAIA": 58.5, "USports": 59.0, "ACAC": 62.0},
    "200BR": {"D1_power": 116.0, "D1_mid": 120.0, "D2": 124.0, "NAIA": 128.0, "USports": 130.0, "ACAC": 136.0},
    "100FR": {"D1_power": 44.5, "D1_mid": 46.0, "D2": 47.5, "NAIA": 49.0, "USports": 49.5, "ACAC": 51.0},
    "200FR": {"D1_power": 97.0, "D1_mid": 101.0, "D2": 104.0, "NAIA": 107.0, "USports": 108.0, "ACAC": 113.0},
    "50FR":  {"D1_power": 20.5, "D1_mid": 21.0, "D2": 21.5, "NAIA": 22.0, "USports": 22.5, "ACAC": 23.5},
    "100BA": {"D1_power": 46.5, "D1_mid": 48.0, "D2": 49.5, "NAIA": 51.0, "USports": 51.5, "ACAC": 54.0},
    "200BA": {"D1_power": 102.0, "D1_mid": 106.0, "D2": 109.0, "NAIA": 113.0, "USports": 114.0, "ACAC": 119.0},
    "100FL": {"D1_power": 47.0, "D1_mid": 49.0, "D2": 50.5, "NAIA": 52.0, "USports": 52.5, "ACAC": 55.0},
    "200FL": {"D1_power": 104.0, "D1_mid": 108.0, "D2": 112.0, "NAIA": 115.0, "USports": 116.0, "ACAC": 122.0},
    "200IM": {"D1_power": 103.0, "D1_mid": 107.0, "D2": 111.0, "NAIA": 114.0, "USports": 115.0, "ACAC": 120.0},
    "400IM": {"D1_power": 224.0, "D1_mid": 232.0, "D2": 240.0, "NAIA": 248.0, "USports": 250.0, "ACAC": 262.0},
    "500FR": {"D1_power": 262.0, "D1_mid": 272.0, "D2": 280.0, "NAIA": 288.0, "USports": 290.0, "ACAC": 305.0},
    "800FR": {"D1_power": 569.0, "D1_mid": 590.0, "D2": 608.0, "NAIA": 626.0, "USports": 630.0, "ACAC": 660.0},
    "1500FR":{"D1_power": 916.0, "D1_mid": 950.0, "D2": 980.0, "NAIA": 1010.0, "USports": 1015.0, "ACAC": 1065.0},
}

# Estimated winning times (1st place, SCY)
DIVISION_WINNING: dict[str, dict[str, float]] = {
    "100BR": {"D1_power": 46.5, "D1_mid": 50.0, "D2": 52.0, "NAIA": 54.0, "USports": 55.0, "ACAC": 58.0},
    "200BR": {"D1_power": 102.0, "D1_mid": 110.0, "D2": 115.0, "NAIA": 120.0, "USports": 122.0, "ACAC": 128.0},
    "100FR": {"D1_power": 41.0, "D1_mid": 43.5, "D2": 45.0, "NAIA": 46.5, "USports": 47.0, "ACAC": 49.0},
    "200FR": {"D1_power": 90.0, "D1_mid": 95.0, "D2": 99.0, "NAIA": 102.0, "USports": 103.0, "ACAC": 108.0},
    "50FR":  {"D1_power": 18.5, "D1_mid": 19.5, "D2": 20.0, "NAIA": 21.0, "USports": 21.5, "ACAC": 22.5},
    "100BA": {"D1_power": 43.0, "D1_mid": 45.5, "D2": 47.0, "NAIA": 48.5, "USports": 49.0, "ACAC": 51.5},
    "200BA": {"D1_power": 95.0, "D1_mid": 100.0, "D2": 104.0, "NAIA": 107.0, "USports": 108.0, "ACAC": 114.0},
    "100FL": {"D1_power": 43.5, "D1_mid": 46.0, "D2": 47.5, "NAIA": 49.5, "USports": 50.0, "ACAC": 52.5},
    "200FL": {"D1_power": 96.0, "D1_mid": 101.0, "D2": 105.0, "NAIA": 109.0, "USports": 110.0, "ACAC": 116.0},
    "200IM": {"D1_power": 95.0, "D1_mid": 100.0, "D2": 104.0, "NAIA": 107.0, "USports": 108.0, "ACAC": 114.0},
    "400IM": {"D1_power": 208.0, "D1_mid": 218.0, "D2": 226.0, "NAIA": 234.0, "USports": 236.0, "ACAC": 248.0},
}

POWER5 = {"SEC", "Big Ten", "ACC", "Pac-12", "Big 12"}


def _division_key(division: str, conference: str) -> str:
    if division == "D1":
        return "D1_power" if conference in POWER5 else "D1_mid"
    if division in ("USports", "U Sports"):
        return "USports"
    if division == "ACAC":
        return "ACAC"
    return division  # D2, NAIA etc.


def _fallback_conf_results(event: str, division: str, conference: str) -> dict:
    dk = _division_key(division, conference)
    cutoffs = DIVISION_CUTOFFS.get(event, {})
    winners = DIVISION_WINNING.get(event, {})
    return {
        "winning_time": winners.get(dk),
        "cutoff_time": cutoffs.get(dk),
    }


# ─────────────────────────────────────────────────────────────────────────────
# University list with real SwimCloud team IDs
# ─────────────────────────────────────────────────────────────────────────────

DEMO_UNIVERSITIES = [
    {
        "name": "Drury University",
        "division": "D2", "conference": "GLVC",
        "country": "USA", "city": "Springfield, MO",
        "team_id": 122,
        "coach_email": "breynolds@drury.edu",
        "admission_rate": 0.72,
        "available_majors": [
            {"title": "Business Administration"}, {"title": "Biology"},
            {"title": "Sport Science"}, {"title": "Psychology"}, {"title": "Computer Science"},
        ],
    },
    {
        "name": "McKendree University",
        "division": "D2", "conference": "GLVC",
        "country": "USA", "city": "Lebanon, IL",
        "team_id": 220,
        "coach_email": "swim@mckendree.edu",
        "admission_rate": 0.62,
        "available_majors": [
            {"title": "Business"}, {"title": "Sport Science"},
            {"title": "Biology"}, {"title": "Psychology"},
        ],
    },
    {
        "name": "University of Indianapolis",
        "division": "D2", "conference": "GLVC",
        "country": "USA", "city": "Indianapolis, IN",
        "team_id": 171,
        "coach_email": "swim@uindy.edu",
        "admission_rate": 0.70,
        "available_majors": [
            {"title": "Business"}, {"title": "Biology"},
            {"title": "Engineering"}, {"title": "Communications"},
        ],
    },
    {
        "name": "University of Michigan",
        "division": "D1", "conference": "Big Ten",
        "country": "USA", "city": "Ann Arbor, MI",
        "team_id": 84,
        "coach_email": "swimming@umich.edu",
        "admission_rate": 0.20,
        "available_majors": [
            {"title": "Engineering"}, {"title": "Business"},
            {"title": "Computer Science"}, {"title": "Biology"}, {"title": "Psychology"},
        ],
    },
    {
        "name": "Indiana University",
        "division": "D1", "conference": "Big Ten",
        "country": "USA", "city": "Bloomington, IN",
        "team_id": 92,
        "coach_email": "swim@iu.edu",
        "admission_rate": 0.80,
        "available_majors": [
            {"title": "Business"}, {"title": "Sport Science"},
            {"title": "Biology"}, {"title": "Communications"},
        ],
    },
    {
        "name": "Auburn University",
        "division": "D1", "conference": "SEC",
        "country": "USA", "city": "Auburn, AL",
        "team_id": 127,
        "coach_email": "swim@auburn.edu",
        "admission_rate": 0.81,
        "available_majors": [
            {"title": "Engineering"}, {"title": "Business"},
            {"title": "Biology"}, {"title": "Communications"}, {"title": "Sport Science"},
        ],
    },
    {
        "name": "University of Denver",
        "division": "D1", "conference": "Summit",
        "country": "USA", "city": "Denver, CO",
        "team_id": 156,
        "coach_email": "swim@du.edu",
        "admission_rate": 0.58,
        "available_majors": [
            {"title": "Business"}, {"title": "Engineering"},
            {"title": "International Studies"}, {"title": "Psychology"},
        ],
    },
    {
        "name": "Keiser University",
        "division": "NAIA", "conference": "Sun Conference",
        "country": "USA", "city": "West Palm Beach, FL",
        "team_id": None,
        "coach_email": "swim@keiseruniversity.edu",
        "admission_rate": 0.68,
        "available_majors": [
            {"title": "Business"}, {"title": "Sport Science"}, {"title": "Biology"},
        ],
    },
    {
        "name": "University of Toronto",
        "division": "USports", "conference": "OUA",
        "country": "CAN", "city": "Toronto, ON",
        "team_id": None,
        "coach_email": "swim@utoronto.ca",
        "admission_rate": 0.43,
        "available_majors": [
            {"title": "Engineering"}, {"title": "Computer Science"},
            {"title": "Business"}, {"title": "Biology"},
        ],
    },
    {
        "name": "University of British Columbia",
        "division": "USports", "conference": "Canada West",
        "country": "CAN", "city": "Vancouver, BC",
        "team_id": None,
        "coach_email": "swim@ubc.ca",
        "admission_rate": 0.52,
        "available_majors": [
            {"title": "Engineering"}, {"title": "Business"},
            {"title": "Biology"}, {"title": "Psychology"}, {"title": "Computer Science"},
        ],
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Request model
# ─────────────────────────────────────────────────────────────────────────────

class TimeEntry(BaseModel):
    event: str           # e.g. "100BR"
    basin: str           # "LCM", "SCM", or "SCY"
    time_seconds: float
    is_direct_scy: bool = False


class DemoMatchRequest(BaseModel):
    first_name: str
    last_name: str
    age: int
    gender: str  # "M" or "F"

    ffn_licence: Optional[str] = None
    times: list[TimeEntry] = []

    # Legacy flat fields (backwards compat with old form)
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
    shoe_size_eu: Optional[int] = None
    bac_mention: Optional[str] = None
    target_majors: Optional[list[str]] = None
    target_divisions: Optional[list[str]] = None


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _scholarship_est(fit_score: float) -> int:
    if fit_score >= 85: return 80
    if fit_score >= 70: return 60
    if fit_score >= 55: return 40
    if fit_score >= 40: return 20
    return 0


def _get_primary_event(scy_times: dict[str, float], scores: dict[str, float]) -> str:
    """Return the event that contributes most to the conference score."""
    if not scy_times:
        return "100FR"
    return max(scy_times.keys(), key=lambda e: scores.get(e, 0))


_STROKE_EN = {
    "BR": "Breaststroke", "FR": "Freestyle",
    "BA": "Backstroke", "FL": "Butterfly", "IM": "Individual Medley",
}


def _format_times_table(scy_times: dict[str, float]) -> str:
    lines = []
    for ev, t in scy_times.items():
        lines.append(f"  {ev:<8} {seconds_to_display(t)} SCY (≈)")
    return "\n".join(lines) if lines else "  (no times provided)"


def _generate_email(
    first_name: str,
    last_name: str,
    age: int,
    bac_mention: Optional[str],
    target_majors: Optional[list[str]],
    uni: dict,
    scy_times: dict[str, float],
    vacancy_detail: dict,
) -> tuple[str, str]:
    # Primary event = the one with best time relative to division
    primary_event = list(scy_times.keys())[0] if scy_times else "100FR"
    stroke_code = get_stroke_from_event(primary_event)
    stroke_en = _STROKE_EN.get(stroke_code, "Swimming")
    dist = primary_event.replace(stroke_code, "")

    distances_str = f"{dist}m"
    other_events = [e for e in scy_times if e != primary_event]
    if other_events:
        distances_str += "/" + "/".join(e.replace(get_stroke_from_event(e), "") + "m" for e in other_events[:2])

    subject = (
        f"Recruit {last_name.upper()} {first_name} — "
        f"French {age}yo {stroke_en} {distances_str}"
    )

    # Vacancy sentence
    vacancy_sentence = ""
    if vacancy_detail.get("is_priority"):
        departing = vacancy_detail.get("seniors_leaving", [])
        events_vac = vacancy_detail.get("events_vacating", [])
        if departing:
            vacancy_sentence = (
                f" I noticed your {events_vac[0] if events_vac else primary_event} "
                f"lineup may have openings following this season "
                f"(following {', '.join(departing[:2])}), "
                f"and I believe I could contribute immediately to your program."
            )

    # Canada note
    canada_note = ""
    if uni.get("country") == "CAN":
        canada_note = (
            "\n\nNote: I am aware there is no dead period equivalent for Canadian "
            "university recruiting, and I am happy to connect at any time."
        )

    times_table = _format_times_table(scy_times)

    country_str = "the United States" if uni["country"] == "USA" else "Canada"

    academic_line = ""
    if bac_mention:
        mention_map = {"TB": "Très Bien (≥16/20)", "B": "Bien (14-16)", "AB": "Assez Bien (12-14)", "P": "Passable (10-12)"}
        academic_line = f"Academically, I hold a {mention_map.get(bac_mention, bac_mention)} average (French Baccalauréat)"
        if target_majors:
            academic_line += f" and am interested in {', '.join(target_majors[:2])}"
        academic_line += ".\n\n"

    body = f"""At the attention of the Swimming & Diving Coaching Staff at {uni['name']}.

Hi,

My name is {first_name} {last_name}. I am a {age}-year-old French swimmer currently competing in France.{vacancy_sentence}

I have always been interested in pursuing my academic and athletic career in {country_str}, and {uni['name']} particularly stands out to me.

Here are my best converted times in Short Course Yards:

{times_table}

{academic_line}I would love the opportunity to speak with your coaching staff. Please feel free to reach me by email or WhatsApp.{canada_note}

Best regards,
{first_name} {last_name}

---
Note: Converted times are approximations (±2-3%). Sending multiple personalized emails significantly increases your chances of being recruited."""

    return subject, body


# ─────────────────────────────────────────────────────────────────────────────
# Fetch live SwimCloud data with timeout + fallback
# ─────────────────────────────────────────────────────────────────────────────

async def _fetch_with_timeout(team_id: int, gender: str, timeout_s: float = 5.0) -> Optional[dict]:
    """Fetch SwimCloud snapshot with a timeout. Returns None on failure."""
    try:
        from scrapers.swimcloud_scraper import fetch_university_snapshot
        return await asyncio.wait_for(
            fetch_university_snapshot(team_id, gender),
            timeout=timeout_s,
        )
    except Exception as e:
        print(f"[demo] SwimCloud fetch failed team={team_id}: {e}")
        return None


def _build_fallback_roster(uni: dict) -> tuple[list[dict], list[dict]]:
    """Return (roster_seniors, roster_all) from static data embedded per university."""
    static: dict[str, tuple[list, list]] = {
        "Drury University": (
            [
                {"name": "Davi Mourao", "study_year": 5, "events": ["100BR", "200BR", "200IM"], "best_times": {"100BR": 51.88, "200BR": 112.51}},
                {"name": "Joao Nogueira", "study_year": 4, "events": ["100BR", "200BR"], "best_times": {"100BR": 53.20, "200BR": 115.40}},
            ],
            [
                {"name": "Davi Mourao", "study_year": 5, "events": ["100BR", "200BR", "200IM"], "best_times": {"100BR": 51.88, "200BR": 112.51}},
                {"name": "Joao Nogueira", "study_year": 4, "events": ["100BR", "200BR"], "best_times": {"100BR": 53.20, "200BR": 115.40}},
                {"name": "Marcus Webb", "study_year": 2, "events": ["100FR", "200FR"], "best_times": {"100FR": 47.1, "200FR": 103.5}},
                {"name": "Luis Torres", "study_year": 1, "events": ["100FL", "200IM"], "best_times": {"100FL": 52.0}},
            ],
        ),
    }
    name = uni["name"]
    if name in static:
        seniors, all_ = static[name]
        return seniors, all_
    return [], []


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

    best: dict[str, float] = {}
    for p in perfs:
        if p.basin_type == "LCM" and p.time_seconds:
            ev = p.event_code
            if ev not in best or p.time_seconds < best[ev]:
                best[ev] = p.time_seconds

    if not best:
        return {"ok": False, "error": "Aucune performance 50m (LCM) trouvée pour cette licence."}

    times_display = {ev: seconds_to_display(t) for ev, t in best.items()}

    return {"ok": True, "times": best, "times_display": times_display}


@router.post("/match")
async def demo_match(payload: DemoMatchRequest):
    """Full matching pipeline — no auth, no DB persistence."""

    # 1. Build times from new `times` list OR legacy flat fields
    raw_times: list[TimeEntry] = list(payload.times)

    legacy_map = {
        "100BR": payload.event_100br_lcm,
        "200BR": payload.event_200br_lcm,
        "100FR": payload.event_100fr_lcm,
        "200FR": payload.event_200fr_lcm,
        "100BA": payload.event_100ba_lcm,
        "100FL": payload.event_100fl_lcm,
        "200IM": payload.event_200im_lcm,
    }
    if not raw_times:
        for ev, t in legacy_map.items():
            if t and t > 0:
                raw_times.append(TimeEntry(event=ev, basin="LCM", time_seconds=t))

    # FFN sync if licence provided and no times submitted
    ffn_error: Optional[str] = None
    times_source = "Manuel"
    if payload.ffn_licence and not raw_times:
        try:
            from scrapers.ffn_scraper import fetch_swimmer_perfs
            perfs = await fetch_swimmer_perfs(payload.ffn_licence)
            for p in perfs:
                if p.basin_type == "LCM" and p.time_seconds:
                    raw_times.append(TimeEntry(
                        event=p.event_code,
                        basin="LCM",
                        time_seconds=p.time_seconds,
                    ))
            if raw_times:
                times_source = "FFN Extranat"
            else:
                ffn_error = "Aucune performance LCM trouvée pour cette licence."
        except Exception as e:
            ffn_error = f"Erreur FFN: {str(e)[:100]}"

    if not raw_times:
        return {
            "error": "Aucun temps fourni. Entre au moins un temps ou une licence FFN valide.",
            "swimmer": None,
            "matches": [],
        }

    # 2. Convert all times to SCY; keep best per event
    scy_times: dict[str, float] = {}
    times_lcm_display: dict[str, str] = {}
    times_scy_display: dict[str, str] = {}
    conversion_details: dict[str, dict] = {}

    for entry in raw_times:
        result = convert_to_scy(entry.event, entry.basin, entry.time_seconds)
        scy = result["scy_seconds"]
        if entry.event not in scy_times or scy < scy_times[entry.event]:
            scy_times[entry.event] = scy
            conversion_details[entry.event] = result
            if entry.basin != "SCY":
                times_lcm_display[entry.event] = seconds_to_display(entry.time_seconds)
            times_scy_display[entry.event] = result["scy_display"]

    avg_confidence = (
        sum(d["confidence"] for d in conversion_details.values()) / len(conversion_details)
        if conversion_details else 0.8
    )
    score_conversion = round(avg_confidence * 100, 2)

    swimmer_events = list(scy_times.keys())

    # Minimal perf list for progression (single data point → score=50)
    perf_dicts = [
        {
            "event_code": ev,
            "basin_type": "SCY",
            "time_seconds": t,
            "time_raw": seconds_to_display(t),
            "date": None,
            "is_pb": True,
        }
        for ev, t in scy_times.items()
    ]

    # 3. Fetch live SwimCloud for all universities in parallel (with timeout)
    gender = payload.gender or "M"
    live_data: dict[str, Optional[dict]] = {}
    uni_with_ids = [(u, u["team_id"]) for u in DEMO_UNIVERSITIES if u["team_id"]]

    async def _fetch_one(uni: dict) -> tuple[str, Optional[dict]]:
        snap = await _fetch_with_timeout(uni["team_id"], gender, timeout_s=5.0)
        return uni["name"], snap

    fetch_tasks = [_fetch_one(u) for u, _ in uni_with_ids]
    fetch_results = await asyncio.gather(*fetch_tasks, return_exceptions=True)
    for item in fetch_results:
        if isinstance(item, tuple):
            name, snap = item
            live_data[name] = snap

    # 4. Match each university
    matches = []
    for uni in DEMO_UNIVERSITIES:
        snap = live_data.get(uni["name"])

        # Build roster_seniors and roster_all
        if snap and snap.get("departing_athletes"):
            roster_seniors = snap["departing_athletes"]
            roster_all = snap.get("roster_all", [])
        else:
            roster_seniors, roster_all = _build_fallback_roster(uni)

        # Conference results: prefer live, fall back to division estimates
        def _get_conf_results(event: str) -> dict:
            if snap:
                top8 = snap.get("team_top8_times", {}).get(event)
                best = snap.get("best_times", {}).get(event, {})
                if top8:
                    return {"winning_time": best.get("time_seconds"), "cutoff_time": top8}
            return _fallback_conf_results(event, uni["division"], uni["conference"])

        # Vacancy
        vacancy_result = compute_vacancy_score(swimmer_events, roster_seniors)
        score_vacancy = vacancy_result["score"]

        # Conference — best event score
        best_conf_score = 0.0
        for ev in swimmer_events:
            if ev in scy_times:
                conf_data = _get_conf_results(ev)
                c = compute_conference_score(scy_times[ev], ev, conf_data)
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

        # Progression
        primary_event = swimmer_events[0] if swimmer_events else None
        if primary_event:
            prog_result = compute_progression_score(perf_dicts, primary_event)
        else:
            prog_result = {"score": 50.0, "trend": "insuffisant", "delta_12m_seconds": None, "slope": None}
        score_progress = prog_result["score"]

        fit_score = round(
            WEIGHTS["vacancy"]    * score_vacancy +
            WEIGHTS["conference"] * score_conf +
            WEIGHTS["conversion"] * score_conversion +
            WEIGHTS["relay"]      * score_relay +
            WEIGHTS["academic"]   * score_academic +
            WEIGHTS["progress"]   * score_progress,
            1,
        )

        subject, body = _generate_email(
            payload.first_name, payload.last_name, payload.age,
            payload.bac_mention, payload.target_majors,
            uni, scy_times, vacancy_result,
        )

        matches.append({
            "university": uni["name"],
            "division": uni["division"],
            "conference": uni["conference"],
            "location": uni["city"],
            "country": uni["country"],
            "fit_score": fit_score,
            "scholarship_est": _scholarship_est(fit_score),
            "data_source": "live" if snap else "estimated",
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
