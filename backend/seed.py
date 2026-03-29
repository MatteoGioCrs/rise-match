"""
Seed script — inserts sample universities, a swimmer, performances, and pre-computed matches.
Run: python seed.py
"""

import asyncio
import uuid
from datetime import date, datetime

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from config import settings
from database import Base
from models import User, SwimmerProfile, Performance, University, RosterAthlete, ConferenceResult, Match

COLLEGE_SCORECARD_API_KEY=iqOCkqTKGZnG3RTGkhwVEgHCDYXQceYLC2Xsybl8

SAMPLE_UNIVERSITIES = [
    {
        "scorecard_id": 179159,
        "swimcloud_team_id": 122,
        "name": "Drury University",
        "city": "Springfield",
        "state": "MO",
        "country": "USA",
        "division": "D2",
        "conference": "GLVC",
        "has_swim_men": True,
        "has_swim_women": True,
        "tuition_out": 32_000,
        "admission_rate": 0.631,
        "campus_size": 1800,
        "coach_head_email": "swim_coach@drury.edu",
        "coach_head_name": "Head Coach Drury",
        "coach_asst_emails": ["asst_swim@drury.edu"],
        "coach_asst_names": ["Asst Coach Drury"],
        "available_majors": [
            {"code": "52", "title": "Business / Management"},
            {"code": "42", "title": "Psychology"},
            {"code": "26", "title": "Biology"},
        ],
    },
    {
        "scorecard_id": 170976,
        "swimcloud_team_id": 1,
        "name": "University of Michigan",
        "city": "Ann Arbor",
        "state": "MI",
        "country": "USA",
        "division": "D1",
        "conference": "Big Ten",
        "has_swim_men": True,
        "has_swim_women": True,
        "tuition_out": 53_000,
        "admission_rate": 0.176,
        "campus_size": 47_000,
        "coach_head_email": "swim@umich.edu",
        "coach_head_name": "Head Coach Michigan",
        "coach_asst_emails": ["asst1@umich.edu", "asst2@umich.edu"],
        "coach_asst_names": ["Asst Coach 1", "Asst Coach 2"],
        "available_majors": [
            {"code": "14", "title": "Engineering"},
            {"code": "52", "title": "Business / Management"},
            {"code": "11", "title": "Computer Science"},
            {"code": "51", "title": "Health Sciences / Medicine"},
        ],
    },
    {
        "scorecard_id": 151351,
        "swimcloud_team_id": 5,
        "name": "Indiana University",
        "city": "Bloomington",
        "state": "IN",
        "country": "USA",
        "division": "D1",
        "conference": "Big Ten",
        "has_swim_men": True,
        "has_swim_women": True,
        "tuition_out": 38_000,
        "admission_rate": 0.792,
        "campus_size": 45_000,
        "coach_head_email": "swim@indiana.edu",
        "coach_head_name": "Head Coach Indiana",
        "coach_asst_emails": ["asst@indiana.edu"],
        "coach_asst_names": ["Asst Coach Indiana"],
        "available_majors": [
            {"code": "52", "title": "Business / Management"},
            {"code": "09", "title": "Communications"},
            {"code": "31", "title": "Sport Science / Kinesiology"},
        ],
    },
    {
        "scorecard_id": 100858,
        "swimcloud_team_id": 8,
        "name": "Auburn University",
        "city": "Auburn",
        "state": "AL",
        "country": "USA",
        "division": "D1",
        "conference": "SEC",
        "has_swim_men": True,
        "has_swim_women": True,
        "tuition_out": 32_000,
        "admission_rate": 0.835,
        "campus_size": 31_000,
        "coach_head_email": "swim@auburn.edu",
        "coach_head_name": "Head Coach Auburn",
        "coach_asst_emails": ["asst@auburn.edu"],
        "coach_asst_names": ["Asst Coach Auburn"],
        "available_majors": [
            {"code": "14", "title": "Engineering"},
            {"code": "01", "title": "Agriculture"},
            {"code": "26", "title": "Biology"},
        ],
    },
    {
        "scorecard_id": 127060,
        "swimcloud_team_id": 15,
        "name": "University of Denver",
        "city": "Denver",
        "state": "CO",
        "country": "USA",
        "division": "D1",
        "conference": "Summit League",
        "has_swim_men": True,
        "has_swim_women": True,
        "tuition_out": 56_000,
        "admission_rate": 0.656,
        "campus_size": 12_000,
        "coach_head_email": "swim@du.edu",
        "coach_head_name": "Head Coach Denver",
        "coach_asst_emails": ["asst@du.edu"],
        "coach_asst_names": ["Asst Coach Denver"],
        "available_majors": [
            {"code": "52", "title": "Business / Management"},
            {"code": "45", "title": "Social Sciences"},
            {"code": "22", "title": "Law"},
        ],
    },
]

# Sample roster seniors for Drury (for vacancy module)
DRURY_SENIORS = [
    {"name": "John Smith", "study_year": 4, "gender": "M", "events": ["100BR", "200BR"], "best_times": {"100BR": 56.1, "200BR": 121.4}},
    {"name": "Mike Johnson", "study_year": 4, "gender": "M", "events": ["200BR", "200IM"], "best_times": {"200BR": 122.8, "200IM": 185.0}},
    {"name": "Tom Brown", "study_year": 2, "gender": "M", "events": ["100FR", "200FR"], "best_times": {"100FR": 46.8, "200FR": 103.2}},
]

DRURY_CONF_RESULTS = [
    {"season": "2024-2025", "event_code": "100BR", "gender": "M", "winning_time": 55.40, "cutoff_time": 59.80},
    {"season": "2024-2025", "event_code": "200BR", "gender": "M", "winning_time": 120.60, "cutoff_time": 128.90},
    {"season": "2024-2025", "event_code": "100FR", "gender": "M", "winning_time": 44.50, "cutoff_time": 46.90},
    {"season": "2024-2025", "event_code": "200FR", "gender": "M", "winning_time": 97.80, "cutoff_time": 103.50},
]


async def seed():
    engine = create_async_engine(settings.database_url, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as db:
        # --- Universities ---
        uni_objs = []
        for u_data in SAMPLE_UNIVERSITIES:
            uni = University(**u_data)
            db.add(uni)
            uni_objs.append(uni)
        await db.flush()

        # --- Roster + conf results for Drury ---
        drury = uni_objs[0]
        for athlete in DRURY_SENIORS:
            db.add(RosterAthlete(
                university_id=drury.id,
                name=athlete["name"],
                study_year=athlete["study_year"],
                gender=athlete["gender"],
                events=athlete["events"],
                best_times=athlete["best_times"],
                season="2024-2025",
            ))

        for cr in DRURY_CONF_RESULTS:
            db.add(ConferenceResult(university_id=drury.id, **cr))

        # --- Swimmer ---
        user = User(
            email="lucas.mercier@example.com",
            plan="match",
            rgpd_consent=True,
            parent_consent=True,
            is_minor=True,
        )
        db.add(user)
        await db.flush()

        swimmer = SwimmerProfile(
            user_id=user.id,
            ffn_licence="0123456",
            first_name="Lucas",
            last_name="Mercier",
            birth_date=date(2008, 3, 15),
            club_name="Stade Français Natation",
            height_cm=184,
            weight_kg=74.0,
            wingspan_cm=192,
            bac_mention="B",
            bac_year=2026,
            toefl_score=92,
            target_majors=["Business / Management", "Sport Science / Kinesiology"],
            target_divisions=["D1", "D2"],
        )
        db.add(swimmer)
        await db.flush()

        # Performances: 100m + 200m breaststroke LCM
        performances = [
            Performance(
                swimmer_id=swimmer.id,
                event_code="100BR",
                basin_type="LCM",
                time_seconds=62.41,
                time_raw="1:02.41",
                date=date(2025, 3, 10),
                meeting_name="Championnats Régionaux IDF",
                fina_points=620,
                is_pb=True,
            ),
            Performance(
                swimmer_id=swimmer.id,
                event_code="100BR",
                basin_type="LCM",
                time_seconds=63.80,
                time_raw="1:03.80",
                date=date(2024, 11, 20),
                meeting_name="Meeting Open Vincennes",
                fina_points=588,
                is_pb=False,
            ),
            Performance(
                swimmer_id=swimmer.id,
                event_code="100BR",
                basin_type="LCM",
                time_seconds=65.10,
                time_raw="1:05.10",
                date=date(2024, 3, 5),
                meeting_name="Championnats Régionaux IDF",
                fina_points=558,
                is_pb=False,
            ),
            Performance(
                swimmer_id=swimmer.id,
                event_code="200BR",
                basin_type="LCM",
                time_seconds=136.03,
                time_raw="2:16.03",
                date=date(2025, 3, 10),
                meeting_name="Championnats Régionaux IDF",
                fina_points=598,
                is_pb=True,
            ),
            Performance(
                swimmer_id=swimmer.id,
                event_code="200BR",
                basin_type="LCM",
                time_seconds=138.50,
                time_raw="2:18.50",
                date=date(2024, 11, 20),
                meeting_name="Meeting Open Vincennes",
                fina_points=571,
                is_pb=False,
            ),
        ]
        for p in performances:
            db.add(p)

        await db.flush()

        # --- Pre-compute matches ---
        from matching.engine import compute_match
        for uni in uni_objs:
            try:
                await compute_match(str(swimmer.id), uni.id, "M", db)
                print(f"  Match computed: {uni.name}")
            except Exception as e:
                print(f"  Match error for {uni.name}: {e}")

        await db.commit()
        print("\nSeed complete.")
        print(f"Swimmer ID: {swimmer.id}")
        print(f"User email: {user.email}")
        print(f"Universities: {[u.name for u in uni_objs]}")


if __name__ == "__main__":
    asyncio.run(seed())
