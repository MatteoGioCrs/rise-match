"""Swimmer profile and FFN sync endpoints."""

import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import SwimmerProfile, User, Performance
from scrapers.ffn_scraper import fetch_swimmer_perfs

router = APIRouter(prefix="/api/swimmer", tags=["swimmers"])


# --- Pydantic schemas ---

class ProfileCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    ffn_licence: Optional[str] = None
    birth_date: Optional[date] = None
    club_name: Optional[str] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    wingspan_cm: Optional[int] = None
    bac_mention: Optional[str] = None
    bac_year: Optional[int] = None
    toefl_score: Optional[int] = None
    sat_score: Optional[int] = None
    target_majors: Optional[list[str]] = None
    target_divisions: Optional[list[str]] = None
    phone: Optional[str] = None
    rgpd_consent: bool = False
    parent_consent: bool = False


class ProfileResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    ffn_licence: Optional[str]
    birth_date: Optional[date]
    club_name: Optional[str]
    height_cm: Optional[int]
    weight_kg: Optional[float]
    wingspan_cm: Optional[int]
    bac_mention: Optional[str]
    toefl_score: Optional[int]
    sat_score: Optional[int]
    target_majors: Optional[list[str]]
    target_divisions: Optional[list[str]]
    is_minor: bool


# --- Helpers ---

def _is_minor(birth_date: Optional[date]) -> bool:
    if not birth_date:
        return False
    today = date.today()
    age = (today - birth_date).days / 365.25
    return age < 18


async def _sync_ffn_background(swimmer_id: str, licence_id: str, db_factory):
    """Background task: scrape FFN and persist performances."""
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            perfs = await fetch_swimmer_perfs(licence_id)
            swimmer_uuid = uuid.UUID(swimmer_id)

            # Remove old scraped performances for this swimmer
            existing = await db.execute(
                select(Performance).where(Performance.swimmer_id == swimmer_uuid)
            )
            for p in existing.scalars().all():
                await db.delete(p)

            # Insert new
            for p in perfs:
                db.add(Performance(
                    swimmer_id=swimmer_uuid,
                    event_code=p.event_code,
                    basin_type=p.basin_type,
                    time_seconds=p.time_seconds,
                    time_raw=p.time_raw,
                    date=p.perf_date,
                    fina_points=p.fina_points,
                    is_pb=p.is_pb,
                ))
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"FFN sync error for {swimmer_id}: {e}")


# --- Endpoints ---

# swimmers.py
# [...] 

@router.post("/profile", response_model=ProfileResponse)
async def create_or_update_profile(
    payload: ProfileCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Create or update swimmer profile (RGPD / Parental consent check disabled for testing)."""
    is_minor = _is_minor(payload.birth_date)

    # Upsert user by email (création silencieuse d'un user fantôme)
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=payload.email,
            rgpd_consent=True, # Forcé à True pour bypasser
            parent_consent=True, # Forcé à True pour bypasser
            is_minor=is_minor,
        )
        db.add(user)
        await db.flush()

    # Upsert profile
    result2 = await db.execute(
        select(SwimmerProfile).where(SwimmerProfile.user_id == user.id)
    )
    profile = result2.scalar_one_or_none()

    if not profile:
        profile = SwimmerProfile(user_id=user.id)
        db.add(profile)

    profile.first_name = payload.first_name
    profile.last_name = payload.last_name
    profile.ffn_licence = payload.ffn_licence
    profile.birth_date = payload.birth_date
    profile.club_name = payload.club_name
    profile.height_cm = payload.height_cm
    profile.weight_kg = payload.weight_kg
    profile.wingspan_cm = payload.wingspan_cm
    profile.bac_mention = payload.bac_mention
    profile.bac_year = payload.bac_year
    profile.toefl_score = payload.toefl_score
    profile.sat_score = payload.sat_score
    profile.target_majors = payload.target_majors
    profile.target_divisions = payload.target_divisions
    profile.phone = payload.phone

    await db.flush()

    return ProfileResponse(
        id=str(profile.id),
        first_name=profile.first_name,
        last_name=profile.last_name,
        ffn_licence=profile.ffn_licence,
        birth_date=profile.birth_date,
        club_name=profile.club_name,
        height_cm=profile.height_cm,
        weight_kg=float(profile.weight_kg) if profile.weight_kg else None,
        wingspan_cm=profile.wingspan_cm,
        bac_mention=profile.bac_mention,
        toefl_score=profile.toefl_score,
        sat_score=profile.sat_score,
        target_majors=profile.target_majors,
        target_divisions=profile.target_divisions,
        is_minor=is_minor,
    )


@router.post("/sync-ffn")
async def sync_ffn(
    swimmer_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger async FFN scraping for swimmer's licence number. Returns job_id."""
    profile = await db.get(SwimmerProfile, uuid.UUID(swimmer_id))
    if not profile:
        raise HTTPException(status_code=404, detail="Nageur introuvable")
    if not profile.ffn_licence:
        raise HTTPException(status_code=422, detail="Numéro de licence FFN requis")

    job_id = str(uuid.uuid4())
    background_tasks.add_task(
        _sync_ffn_background,
        swimmer_id,
        profile.ffn_licence,
        None,
    )

    return {"job_id": job_id, "status": "queued", "licence": profile.ffn_licence}


class ProfilePatch(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    ffn_licence: Optional[str] = None
    birth_date: Optional[date] = None
    club_name: Optional[str] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    wingspan_cm: Optional[int] = None
    bac_mention: Optional[str] = None
    bac_year: Optional[int] = None
    toefl_score: Optional[int] = None
    sat_score: Optional[int] = None
    target_majors: Optional[list[str]] = None
    target_divisions: Optional[list[str]] = None
    phone: Optional[str] = None


@router.patch("/profile/{swimmer_id}", response_model=ProfileResponse)
async def patch_profile(
    swimmer_id: str,
    payload: ProfilePatch,
    db: AsyncSession = Depends(get_db),
):
    """Partial update: only provided fields are updated."""
    profile = await db.get(SwimmerProfile, uuid.UUID(swimmer_id))
    if not profile:
        raise HTTPException(status_code=404, detail="Nageur introuvable")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.flush()

    return ProfileResponse(
        id=str(profile.id),
        first_name=profile.first_name,
        last_name=profile.last_name,
        ffn_licence=profile.ffn_licence,
        birth_date=profile.birth_date,
        club_name=profile.club_name,
        height_cm=profile.height_cm,
        weight_kg=float(profile.weight_kg) if profile.weight_kg else None,
        wingspan_cm=profile.wingspan_cm,
        bac_mention=profile.bac_mention,
        toefl_score=profile.toefl_score,
        sat_score=profile.sat_score,
        target_majors=profile.target_majors,
        target_divisions=profile.target_divisions,
        is_minor=_is_minor(profile.birth_date),
    )


@router.get("/profile/{swimmer_id}", response_model=ProfileResponse)
async def get_profile(swimmer_id: str, db: AsyncSession = Depends(get_db)):
    profile = await db.get(SwimmerProfile, uuid.UUID(swimmer_id))
    if not profile:
        raise HTTPException(status_code=404, detail="Nageur introuvable")

    return ProfileResponse(
        id=str(profile.id),
        first_name=profile.first_name,
        last_name=profile.last_name,
        ffn_licence=profile.ffn_licence,
        birth_date=profile.birth_date,
        club_name=profile.club_name,
        height_cm=profile.height_cm,
        weight_kg=float(profile.weight_kg) if profile.weight_kg else None,
        wingspan_cm=profile.wingspan_cm,
        bac_mention=profile.bac_mention,
        toefl_score=profile.toefl_score,
        sat_score=profile.sat_score,
        target_majors=profile.target_majors,
        target_divisions=profile.target_divisions,
        is_minor=_is_minor(profile.birth_date),
    )
