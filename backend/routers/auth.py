"""Auth endpoints: register, login, me."""

import uuid
from datetime import datetime, timedelta
from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, jwt
from passlib.context import CryptContext

from config import settings
from database import get_db
from models import User, SwimmerProfile

router = APIRouter(prefix="/api/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")


def _is_minor(birth_date: Optional[date]) -> bool:
    if not birth_date:
        return False
    return (date.today() - birth_date).days / 365.25 < 18


# --- Schemas ---

class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    birth_date: Optional[date] = None
    ffn_licence: Optional[str] = None
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


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    swimmer_id: str
    email: str
    plan: str
    first_name: str
    last_name: str


class MeResponse(BaseModel):
    swimmer_id: str
    email: str
    plan: str
    first_name: str
    last_name: str
    ffn_licence: Optional[str]
    is_minor: bool


# --- Endpoints ---

@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 8 caractères")

    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    is_minor = _is_minor(payload.birth_date)
    if is_minor and not payload.parent_consent:
        raise HTTPException(status_code=422, detail="Consentement parental requis pour les mineurs")

    password_hash = pwd_context.hash(payload.password)

    user = User(
        email=payload.email,
        password_hash=password_hash,
        rgpd_consent=payload.rgpd_consent,
        parent_consent=payload.parent_consent if is_minor else True,
        is_minor=is_minor,
    )
    db.add(user)
    await db.flush()

    profile = SwimmerProfile(
        user_id=user.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        birth_date=payload.birth_date,
        ffn_licence=payload.ffn_licence,
        club_name=payload.club_name,
        height_cm=payload.height_cm,
        weight_kg=payload.weight_kg,
        wingspan_cm=payload.wingspan_cm,
        bac_mention=payload.bac_mention,
        bac_year=payload.bac_year,
        toefl_score=payload.toefl_score,
        sat_score=payload.sat_score,
        target_majors=payload.target_majors,
        target_divisions=payload.target_divisions,
        phone=payload.phone,
    )
    db.add(profile)
    await db.flush()

    token = create_access_token({
        "sub": str(user.id),
        "swimmer_id": str(profile.id),
        "email": user.email,
        "plan": user.plan,
    })

    return AuthResponse(
        token=token,
        swimmer_id=str(profile.id),
        email=user.email,
        plan=user.plan,
        first_name=profile.first_name,
        last_name=profile.last_name,
    )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if not pwd_context.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    result2 = await db.execute(
        select(SwimmerProfile).where(SwimmerProfile.user_id == user.id)
    )
    profile = result2.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    token = create_access_token({
        "sub": str(user.id),
        "swimmer_id": str(profile.id),
        "email": user.email,
        "plan": user.plan,
    })

    return AuthResponse(
        token=token,
        swimmer_id=str(profile.id),
        email=user.email,
        plan=user.plan,
        first_name=profile.first_name,
        last_name=profile.last_name,
    )


@router.get("/me", response_model=MeResponse)
async def me(authorization: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")

    token = authorization.removeprefix("Bearer ")
    payload = decode_token(token)

    swimmer_id = payload.get("swimmer_id")
    if not swimmer_id:
        raise HTTPException(status_code=401, detail="Token invalide")

    profile = await db.get(SwimmerProfile, uuid.UUID(swimmer_id))
    if not profile:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    user = await db.get(User, profile.user_id)

    return MeResponse(
        swimmer_id=str(profile.id),
        email=user.email if user else payload.get("email", ""),
        plan=user.plan if user else payload.get("plan", "free"),
        first_name=profile.first_name,
        last_name=profile.last_name,
        ffn_licence=profile.ffn_licence,
        is_minor=user.is_minor if user else False,
    )
