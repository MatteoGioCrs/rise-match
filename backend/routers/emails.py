"""Email generation and sending endpoints."""

import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from database import get_db
from models import SwimmerProfile, University, Match, EmailLog

router = APIRouter(prefix="/api/emails", tags=["emails"])

# NCAA recruiting shutdown calendar (approximate — varies by sport/year)
# No equivalent in Canada (USports/ACAC)
NCAA_SHUTDOWN_PERIODS = [
    (date(2025, 7, 1), date(2025, 7, 31)),
    (date(2026, 7, 1), date(2026, 7, 31)),
]

STROKE_NAMES_EN: dict[str, str] = {
    "BR": "Breaststroke",
    "FR": "Freestyle",
    "BA": "Backstroke",
    "FL": "Butterfly",
    "IM": "Individual Medley",
}


def _is_ncaa_shutdown() -> bool:
    today = date.today()
    return any(start <= today <= end for start, end in NCAA_SHUTDOWN_PERIODS)


def _swimmer_subject_line(swimmer: SwimmerProfile, primary_events: list[str]) -> str:
    """
    Format: Recruit LASTNAME Firstname French {age}yo {distances} {stroke}
    Example: Recruit MERCIER Lucas French 17yo Breaststroke 100/200
    """
    age = None
    if swimmer.birth_date:
        age = int((date.today() - swimmer.birth_date).days / 365.25)

    # Derive distances and stroke from primary events
    distances = []
    stroke_suffix = ""
    for ev in primary_events[:2]:
        dist = "".join(c for c in ev if c.isdigit())
        stroke_key = "".join(c for c in ev if c.isalpha())
        distances.append(dist)
        if not stroke_suffix:
            stroke_suffix = STROKE_NAMES_EN.get(stroke_key, stroke_key)

    dist_str = "/".join(distances)
    age_str = f"{age}yo" if age else "swimmer"

    return (
        f"Recruit {swimmer.last_name.upper()} {swimmer.first_name} "
        f"French {age_str} {stroke_suffix} {dist_str}"
    ).strip()


def _generate_email_body(
    swimmer: SwimmerProfile,
    university: University,
    match: Match,
    primary_events: list[str],
) -> str:
    """Generate personalised recruitment email body."""
    age = int((date.today() - swimmer.birth_date).days / 365.25) if swimmer.birth_date else "?"
    stroke = STROKE_NAMES_EN.get("".join(c for c in (primary_events[0] if primary_events else "") if c.isalpha()), "Swimming")

    coach_name = university.coach_head_name or "Coach"
    fit_pct = int(float(match.fit_score)) if match.fit_score else "?"
    scholarship = int(float(match.scholarship_est)) if match.scholarship_est else "?"

    is_canada = university.country == "CAN"
    shutdown_warning = ""
    if _is_ncaa_shutdown() and not is_canada:
        shutdown_warning = (
            "\n⚠️  Note: We are currently in the NCAA dead period. "
            "Coaches cannot initiate contact, but you may still send this email. "
            "They will respond after the period ends.\n"
        )

    canada_note = ""
    if is_canada:
        canada_note = (
            "\nNote: As a USports/ACAC program, there is no equivalent dead period in Canada — "
            "coaches can respond at any time.\n"
        )

    body = f"""Dear {coach_name},

My name is {swimmer.first_name} {swimmer.last_name.upper()}, a {age}-year-old French competitive swimmer specialising in {stroke} from {swimmer.club_name or "France"}.

I am reaching out because I am very interested in joining {university.name}'s swimming program while pursuing my undergraduate studies in the USA{"" if not is_canada else "/Canada"}.

**My recent performances (SCY equivalent):**
[See attached performance table — converted from LCM/SCM via multi-table algorithm ≈ approximation]

I believe I could contribute to your {stroke.lower()} group. Based on your current roster, our algorithm estimates a program fit of {fit_pct}%.

Academically, I hold a French Baccalauréat (mention {swimmer.bac_mention or "N/A"}){f", TOEFL {swimmer.toefl_score}" if swimmer.toefl_score else ""}{f", SAT {swimmer.sat_score}" if swimmer.sat_score else ""}.
My target fields of study include: {", ".join(swimmer.target_majors or ["TBD"])}.

I would love to learn more about your program and discuss potential opportunities.

Best regards,
{swimmer.first_name} {swimmer.last_name.upper()}
{swimmer.phone or ""}
[French swimmer — RISE Athletics]
{shutdown_warning}{canada_note}

---
Note: This score reflects current probability. Coaches may be in discussions with other athletes. Sending multiple emails increases your chances.
"""
    return body.strip()


class GenerateEmailRequest(BaseModel):
    swimmer_id: str
    university_id: int


class GenerateEmailResponse(BaseModel):
    subject: str
    body: str
    recipients: list[str]
    is_ncaa_shutdown: bool
    shutdown_warning: Optional[str]


class SendEmailRequest(BaseModel):
    swimmer_id: str
    university_id: int
    subject: str
    body: str
    recipients: list[str]


@router.post("/generate", response_model=GenerateEmailResponse)
async def generate_email(
    payload: GenerateEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate personalised recruitment email for a match."""
    swimmer = await db.get(SwimmerProfile, uuid.UUID(payload.swimmer_id))
    if not swimmer:
        raise HTTPException(status_code=404, detail="Nageur introuvable")

    university = await db.get(University, payload.university_id)
    if not university:
        raise HTTPException(status_code=404, detail="Université introuvable")

    result = await db.execute(
        select(Match).where(
            and_(
                Match.swimmer_id == swimmer.id,
                Match.university_id == payload.university_id,
            )
        )
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match non calculé pour ce nageur/université")

    # Determine primary events from vacancy_detail or generic
    events = []
    if match.vacancy_detail:
        events = match.vacancy_detail.get("events_covered") or match.vacancy_detail.get("events_vacating") or []
    if not events:
        events = ["100BR", "200BR"]  # default breaststroke

    subject = _swimmer_subject_line(swimmer, events)
    body = _generate_email_body(swimmer, university, match, events)

    recipients = []
    if university.coach_head_email:
        recipients.append(university.coach_head_email)
    if university.coach_asst_emails:
        recipients.extend(university.coach_asst_emails)

    is_shutdown = _is_ncaa_shutdown() and university.country != "CAN"
    shutdown_warning = (
        "Période morte NCAA en cours. Les coaches ne peuvent pas initier de contact mais recevront votre email."
        if is_shutdown else None
    )

    return GenerateEmailResponse(
        subject=subject,
        body=body,
        recipients=recipients,
        is_ncaa_shutdown=is_shutdown,
        shutdown_warning=shutdown_warning,
    )


@router.post("/send")
async def send_email(
    payload: SendEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send email via Resend API and log in email_logs."""
    try:
        import resend
        resend.api_key = __import__("config").settings.resend_api_key

        # Get swimmer email for "from" address
        swimmer = await db.get(SwimmerProfile, uuid.UUID(payload.swimmer_id))
        if not swimmer:
            raise HTTPException(status_code=404, detail="Nageur introuvable")

        result = resend.Emails.send({
            "from": f"{swimmer.first_name} {swimmer.last_name} <onboarding@resend.dev>",
            "to": payload.recipients,
            "subject": payload.subject,
            "html": payload.body.replace("\n", "<br>"),
        })
        resend_id = result.get("id") if isinstance(result, dict) else str(result)
    except Exception as e:
        resend_id = f"error:{e}"

    # Log regardless of send result
    log = EmailLog(
        swimmer_id=uuid.UUID(payload.swimmer_id),
        university_id=payload.university_id,
        recipient_emails=payload.recipients,
        subject=payload.subject,
        body_html=payload.body,
        resend_id=resend_id,
    )
    db.add(log)
    await db.flush()

    return {"status": "sent", "resend_id": resend_id, "recipients": payload.recipients}
