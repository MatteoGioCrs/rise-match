"""
Matching engine: orchestrates all 6 modules to produce a fit_score.
"""

import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from models import SwimmerProfile, Performance, University, RosterAthlete, ConferenceResult, Match
from matching.conversion import convert_to_scy
from matching.vacancy import compute_vacancy_score
from matching.conference import compute_conference_score
from matching.relay import compute_relay_score
from matching.academic import compute_academic_score
from matching.progression import compute_progression_score, estimate_potential

WEIGHTS = {
    "vacancy":    0.30,
    "conference": 0.20,
    "conversion": 0.20,
    "relay":      0.10,
    "academic":   0.15,
    "progress":   0.05,
}


def _estimate_scholarship(fit_score: float) -> float:
    """Map fit_score bands to scholarship percentage estimate."""
    if fit_score >= 85:
        return 80.0
    if fit_score >= 70:
        return 60.0
    if fit_score >= 55:
        return 40.0
    if fit_score >= 40:
        return 20.0
    return 0.0


async def compute_match(
    swimmer_id: str,
    university_id: int,
    gender: str,
    db: AsyncSession,
) -> dict:
    """
    Orchestrate all 6 modules.
    1. Fetch swimmer profile + performances
    2. Convert best times to SCY
    3. Fetch university roster (seniors for vacancy)
    4. Fetch conference results
    5. Fetch academic data
    6. Run modules
    7. Compute weighted fit_score
    8. Estimate scholarship
    9. Upsert into matches table
    10. Return full match dict
    """
    # 1. Swimmer
    swimmer = await db.get(SwimmerProfile, uuid.UUID(swimmer_id))
    if not swimmer:
        raise ValueError(f"Swimmer {swimmer_id} not found")

    perfs_result = await db.execute(
        select(Performance).where(Performance.swimmer_id == swimmer.id)
    )
    performances = perfs_result.scalars().all()
    perf_dicts = [
        {
            "event_code": p.event_code,
            "basin_type": p.basin_type,
            "time_seconds": float(p.time_seconds) if p.time_seconds else None,
            "time_raw": p.time_raw,
            "date": p.date,
            "is_pb": p.is_pb,
        }
        for p in performances
    ]

    # 2. Best times → SCY per event
    pb_per_event: dict[str, dict] = {}
    for p in perf_dicts:
        ev = p["event_code"]
        if p["time_seconds"] is None:
            continue
        if ev not in pb_per_event or p["time_seconds"] < pb_per_event[ev]["time_seconds"]:
            pb_per_event[ev] = p

    scy_times: dict[str, float] = {}
    conversion_details: dict[str, dict] = {}
    for ev, p in pb_per_event.items():
        result = convert_to_scy(ev, p["basin_type"], float(p["time_seconds"]))
        scy_times[ev] = result["scy_seconds"]
        conversion_details[ev] = result

    avg_confidence = (
        sum(d["confidence"] for d in conversion_details.values()) / len(conversion_details)
        if conversion_details else 0.8
    )
    score_conversion = round(avg_confidence * 100, 2)

    # 3. University
    university = await db.get(University, university_id)
    if not university:
        raise ValueError(f"University {university_id} not found")

    roster_result = await db.execute(
        select(RosterAthlete).where(
            and_(
                RosterAthlete.university_id == university_id,
                RosterAthlete.gender == gender,
            )
        )
    )
    roster = roster_result.scalars().all()
    roster_dicts = [
        {
            "name": a.name,
            "study_year": a.study_year,
            "events": a.events or [],
            "best_times": a.best_times or {},
        }
        for a in roster
    ]
    roster_seniors = [r for r in roster_dicts if r["study_year"] == 4]

    # 4. Conference results (latest season, main swimmer event)
    swimmer_events = list(pb_per_event.keys())
    conf_results_raw = await db.execute(
        select(ConferenceResult).where(
            and_(
                ConferenceResult.university_id == university_id,
                ConferenceResult.gender == gender,
            )
        )
    )
    conf_rows = conf_results_raw.scalars().all()

    # Build a dict {event_code: {winning_time, cutoff_time}}
    conf_by_event: dict[str, dict] = {}
    for row in conf_rows:
        conf_by_event[row.event_code] = {
            "winning_time": float(row.winning_time) if row.winning_time else None,
            "cutoff_time": float(row.cutoff_time) if row.cutoff_time else None,
        }

    # 5. Modules
    vacancy_result = compute_vacancy_score(swimmer_events, roster_seniors)
    score_vacancy = vacancy_result["score"]

    # Conference: use best event for swimmer
    best_conf_score = 0.0
    conf_detail = {}
    for ev in swimmer_events:
        if ev in scy_times and ev in conf_by_event:
            c = compute_conference_score(scy_times[ev], ev, conf_by_event[ev])
            if c["score"] > best_conf_score:
                best_conf_score = c["score"]
                conf_detail = c
    score_conf = best_conf_score if best_conf_score > 0 else 40.0

    relay_result = compute_relay_score(scy_times, roster_dicts)
    score_relay = relay_result["score"]

    academic_result = compute_academic_score(
        target_majors=swimmer.target_majors or [],
        bac_mention=swimmer.bac_mention,
        available_majors=university.available_majors or [],
        admission_rate=float(university.admission_rate) if university.admission_rate else None,
    )
    score_academic = academic_result["score"]

    # Progression: use primary event
    primary_event = swimmer_events[0] if swimmer_events else None
    if primary_event:
        prog_result = compute_progression_score(perf_dicts, primary_event)
    else:
        prog_result = {"score": 50.0, "trend": "insuffisant", "delta_12m_seconds": None, "slope": None}
    score_progress = prog_result["score"]

    # 7. Weighted fit score
    fit_score = (
        WEIGHTS["vacancy"]    * score_vacancy +
        WEIGHTS["conference"] * score_conf +
        WEIGHTS["conversion"] * score_conversion +
        WEIGHTS["relay"]      * score_relay +
        WEIGHTS["academic"]   * score_academic +
        WEIGHTS["progress"]   * score_progress
    )
    fit_score = round(fit_score, 2)

    # 8. Scholarship estimate
    scholarship_est = _estimate_scholarship(fit_score)

    # 9. Upsert
    existing = await db.execute(
        select(Match).where(
            and_(
                Match.swimmer_id == swimmer.id,
                Match.university_id == university_id,
                Match.gender == gender,
            )
        )
    )
    match_row = existing.scalar_one_or_none()

    if match_row:
        match_row.score_vacancy = score_vacancy
        match_row.score_conf = score_conf
        match_row.score_conversion = score_conversion
        match_row.score_relay = score_relay
        match_row.score_academic = score_academic
        match_row.score_progress = score_progress
        match_row.fit_score = fit_score
        match_row.scholarship_est = scholarship_est
        match_row.vacancy_detail = vacancy_result
        match_row.relay_detail = relay_result
        match_row.computed_at = datetime.utcnow()
    else:
        match_row = Match(
            swimmer_id=swimmer.id,
            university_id=university_id,
            gender=gender,
            score_vacancy=score_vacancy,
            score_conf=score_conf,
            score_conversion=score_conversion,
            score_relay=score_relay,
            score_academic=score_academic,
            score_progress=score_progress,
            fit_score=fit_score,
            scholarship_est=scholarship_est,
            vacancy_detail=vacancy_result,
            relay_detail=relay_result,
        )
        db.add(match_row)

    await db.flush()

    return {
        "swimmer_id": str(swimmer.id),
        "university_id": university_id,
        "university_name": university.name,
        "gender": gender,
        "fit_score": fit_score,
        "scholarship_est": scholarship_est,
        "modules": {
            "vacancy": vacancy_result,
            "conference": conf_detail,
            "conversion": {"score": score_conversion, "details": conversion_details},
            "relay": relay_result,
            "academic": academic_result,
            "progression": prog_result,
        },
        "weights": WEIGHTS,
    }


async def recompute_all_matches_for_swimmer(
    swimmer_id: str,
    gender: str,
    db: AsyncSession,
) -> list[dict]:
    """Recompute matches for all universities in DB for this swimmer."""
    universities_result = await db.execute(select(University))
    universities = universities_result.scalars().all()

    results = []
    for uni in universities:
        try:
            match = await compute_match(swimmer_id, uni.id, gender, db)
            results.append(match)
        except Exception as e:
            results.append({"university_id": uni.id, "error": str(e)})
    return results
