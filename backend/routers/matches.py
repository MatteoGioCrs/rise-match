"""Match list, detail, and recompute endpoints."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from database import get_db
from models import Match, SwimmerProfile, University, User

router = APIRouter(prefix="/api/matches", tags=["matches"])

FREE_PLAN_LIMIT = 5


class MatchSummary(BaseModel):
    id: int
    university_id: int
    university_name: str
    division: Optional[str]
    conference: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: str
    fit_score: float
    scholarship_est: Optional[float]
    score_vacancy: Optional[float]
    score_conf: Optional[float]
    score_academic: Optional[float]
    is_priority: bool
    is_blurred: bool  # freemium gate
    coach_head_email: Optional[str]  # null for free plan


class MatchDetail(MatchSummary):
    score_conversion: Optional[float]
    score_relay: Optional[float]
    score_progress: Optional[float]
    vacancy_detail: Optional[dict]
    relay_detail: Optional[dict]


@router.get("/{swimmer_id}", response_model=list[MatchSummary])
async def list_matches(
    swimmer_id: str,
    division: Optional[str] = Query(None),
    sort: str = Query("fit_score"),
    plan: str = Query("free"),  # in production, derive from JWT
    db: AsyncSession = Depends(get_db),
):
    """
    List matches sorted by fit_score.
    Free plan: top 5 only, no coach emails, vacancy_detail nulled.
    """
    swimmer_uuid = uuid.UUID(swimmer_id)
    stmt = select(Match).where(Match.swimmer_id == swimmer_uuid)

    if sort == "academic":
        stmt = stmt.order_by(Match.score_academic.desc().nullslast())
    else:
        stmt = stmt.order_by(Match.fit_score.desc())

    result = await db.execute(stmt)
    matches = result.scalars().all()

    summaries = []
    for i, m in enumerate(matches):
        uni = await db.get(University, m.university_id)
        if not uni:
            continue
        if division and uni.division != division:
            continue

        is_blurred = plan == "free" and i >= FREE_PLAN_LIMIT
        is_priority = bool(
            m.vacancy_detail and m.vacancy_detail.get("is_priority")
        )

        summaries.append(MatchSummary(
            id=m.id,
            university_id=m.university_id,
            university_name=uni.name,
            division=uni.division,
            conference=uni.conference,
            city=uni.city,
            state=uni.state,
            country=uni.country,
            fit_score=float(m.fit_score),
            scholarship_est=float(m.scholarship_est) if m.scholarship_est else None,
            score_vacancy=float(m.score_vacancy) if m.score_vacancy else None,
            score_conf=float(m.score_conf) if m.score_conf else None,
            score_academic=float(m.score_academic) if m.score_academic else None,
            is_priority=is_priority,
            is_blurred=is_blurred,
            coach_head_email=uni.coach_head_email if plan != "free" else None,
        ))

    return summaries


@router.get("/{swimmer_id}/{university_id}", response_model=MatchDetail)
async def get_match_detail(
    swimmer_id: str,
    university_id: int,
    plan: str = Query("match"),
    db: AsyncSession = Depends(get_db),
):
    """Full match detail with all 6 module scores. Match plan required."""
    if plan == "free":
        raise HTTPException(
            status_code=403,
            detail="Match plan requis pour accéder aux détails complets.",
        )

    swimmer_uuid = uuid.UUID(swimmer_id)
    result = await db.execute(
        select(Match).where(
            and_(
                Match.swimmer_id == swimmer_uuid,
                Match.university_id == university_id,
            )
        )
    )
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Match introuvable")

    uni = await db.get(University, university_id)

    return MatchDetail(
        id=m.id,
        university_id=m.university_id,
        university_name=uni.name if uni else "?",
        division=uni.division if uni else None,
        conference=uni.conference if uni else None,
        city=uni.city if uni else None,
        state=uni.state if uni else None,
        country=uni.country if uni else "USA",
        fit_score=float(m.fit_score),
        scholarship_est=float(m.scholarship_est) if m.scholarship_est else None,
        score_vacancy=float(m.score_vacancy) if m.score_vacancy else None,
        score_conf=float(m.score_conf) if m.score_conf else None,
        score_conversion=float(m.score_conversion) if m.score_conversion else None,
        score_relay=float(m.score_relay) if m.score_relay else None,
        score_academic=float(m.score_academic) if m.score_academic else None,
        score_progress=float(m.score_progress) if m.score_progress else None,
        vacancy_detail=m.vacancy_detail,
        relay_detail=m.relay_detail,
        is_priority=bool(m.vacancy_detail and m.vacancy_detail.get("is_priority")),
        is_blurred=False,
        coach_head_email=uni.coach_head_email if uni else None,
    )


@router.post("/recompute")
async def recompute_matches(
    swimmer_id: str,
    gender: str = Query("M"),
    db: AsyncSession = Depends(get_db),
):
    """Queue match recomputation for swimmer against all universities in DB."""
    from matching.engine import recompute_all_matches_for_swimmer

    try:
        results = await recompute_all_matches_for_swimmer(swimmer_id, gender, db)
        return {
            "status": "completed",
            "computed": len([r for r in results if "fit_score" in r]),
            "errors": len([r for r in results if "error" in r]),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
