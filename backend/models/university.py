from sqlalchemy import (
    Column, String, Boolean, Integer, Numeric, Text,
    ForeignKey, ARRAY, BigInteger, TIMESTAMP
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class University(Base):
    __tablename__ = "universities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scorecard_id = Column(Integer, unique=True)
    swimcloud_team_id = Column(Integer, unique=True)
    name = Column(Text, nullable=False)
    city = Column(Text)
    state = Column(Text)
    country = Column(Text, default="USA")  # 'USA' or 'CAN'
    division = Column(Text)  # 'D1', 'D2', 'D3', 'NAIA', 'NJCAA', 'USports', 'ACAC'
    conference = Column(Text)
    has_swim_men = Column(Boolean, default=True)
    has_swim_women = Column(Boolean, default=True)
    tuition_out = Column(Integer)  # annual USD
    admission_rate = Column(Numeric(4, 3))
    campus_size = Column(Integer)
    available_majors = Column(JSONB)
    coach_head_email = Column(Text)
    coach_asst_emails = Column(ARRAY(Text))
    coach_head_name = Column(Text)
    coach_asst_names = Column(ARRAY(Text))
    last_scraped = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    roster = relationship("RosterAthlete", back_populates="university", cascade="all, delete-orphan")
    conference_results = relationship("ConferenceResult", back_populates="university", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="university")


class RosterAthlete(Base):
    __tablename__ = "roster_athletes"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    university_id = Column(Integer, ForeignKey("universities.id", ondelete="CASCADE"))
    swimcloud_id = Column(Text)
    name = Column(Text, nullable=False)
    study_year = Column(Integer)  # 1-5
    gender = Column(Text)  # 'M', 'F'
    events = Column(ARRAY(Text))
    best_times = Column(JSONB)  # {'100BR': 57.8, '200BR': 123.1}
    season = Column(Text)  # '2024-2025'
    scraped_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    university = relationship("University", back_populates="roster")


class ConferenceResult(Base):
    __tablename__ = "conference_results"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    university_id = Column(Integer, ForeignKey("universities.id"))
    season = Column(Text, nullable=False)
    event_code = Column(Text, nullable=False)
    gender = Column(Text)
    rank_in_conf = Column(Integer)
    winning_time = Column(Numeric(8, 2))
    cutoff_time = Column(Numeric(8, 2))  # 8th place = last scorer in NCAA
    scraped_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    university = relationship("University", back_populates="conference_results")