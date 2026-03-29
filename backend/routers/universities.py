"""University search and detail endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models import University, RosterAthlete

router = APIRouter(prefix="/api/universities", tags=["universities"])


class UniversityCard(BaseModel):
    id: int
    name: str
    city: Optional[str]
    state: Optional[str]
    country: str
    division: Optional[str]
    conference: Optional[str]
    tuition_out: Optional[int]
    admission_rate: Optional[float]
    has_swim_men: bool
    has_swim_women: bool
    coach_head_name: Optional[str]
    roster_count: int


class UniversityDetail(UniversityCard):
    coach_head_email: Optional[str]
    coach_asst_emails: Optional[list[str]]
    coach_asst_names: Optional[list[str]]
    available_majors: Optional[list]
    campus_size: Optional[int]


@router.get("/search", response_model=list[UniversityCard])
async def search_universities(
    division: Optional[str] = Query(None),
    conference: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    major: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Search universities with filters."""
    stmt = select(University)

    if division:
        stmt = stmt.where(University.division == division)
    if conference:
        stmt = stmt.where(University.conference.ilike(f"%{conference}%"))
    if country:
        stmt = stmt.where(University.country == country.upper())
    if q:
        stmt = stmt.where(University.name.ilike(f"%{q}%"))

    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    unis = result.scalars().all()

    cards = []
    for u in unis:
        # Roster count
        rc_result = await db.execute(
            select(RosterAthlete).where(RosterAthlete.university_id == u.id)
        )
        roster_count = len(rc_result.scalars().all())

        cards.append(UniversityCard(
            id=u.id,
            name=u.name,
            city=u.city,
            state=u.state,
            country=u.country,
            division=u.division,
            conference=u.conference,
            tuition_out=u.tuition_out,
            admission_rate=float(u.admission_rate) if u.admission_rate else None,
            has_swim_men=u.has_swim_men,
            has_swim_women=u.has_swim_women,
            coach_head_name=u.coach_head_name,
            roster_count=roster_count,
        ))

    return cards


@router.get("/{uni_id}", response_model=UniversityDetail)
async def get_university(uni_id: int, db: AsyncSession = Depends(get_db)):
    """Full university card with roster summary and academic info."""
    university = await db.get(University, uni_id)
    if not university:
        raise HTTPException(status_code=404, detail="Université introuvable")

    rc_result = await db.execute(
        select(RosterAthlete).where(RosterAthlete.university_id == uni_id)
    )
    roster_count = len(rc_result.scalars().all())

    return UniversityDetail(
        id=university.id,
        name=university.name,
        city=university.city,
        state=university.state,
        country=university.country,
        division=university.division,
        conference=university.conference,
        tuition_out=university.tuition_out,
        admission_rate=float(university.admission_rate) if university.admission_rate else None,
        has_swim_men=university.has_swim_men,
        has_swim_women=university.has_swim_women,
        coach_head_name=university.coach_head_name,
        coach_head_email=university.coach_head_email,
        coach_asst_emails=university.coach_asst_emails or [],
        coach_asst_names=university.coach_asst_names or [],
        available_majors=university.available_majors or [],
        campus_size=university.campus_size,
        roster_count=roster_count,
    )
