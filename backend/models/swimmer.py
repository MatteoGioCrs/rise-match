import uuid
from datetime import date, datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, Numeric, Date, Text,
    ForeignKey, ARRAY, BigInteger
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, unique=True, nullable=False)
    plan = Column(Text, default="free")  # 'free', 'match', 'accompanied'
    stripe_customer = Column(Text)
    rgpd_consent = Column(Boolean, default=False)
    parent_consent = Column(Boolean, default=False)
    is_minor = Column(Boolean, default=False)
    created_at = Column(TIMESTAMPTZ, server_default=func.now())
    deleted_at = Column(TIMESTAMPTZ)  # soft delete for GDPR

    profile = relationship("SwimmerProfile", back_populates="user", uselist=False)


class SwimmerProfile(Base):
    __tablename__ = "swimmer_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    ffn_licence = Column(Text, unique=True)
    first_name = Column(Text, nullable=False)
    last_name = Column(Text, nullable=False)
    birth_date = Column(Date)
    club_name = Column(Text)
    height_cm = Column(Integer)
    weight_kg = Column(Numeric(5, 1))
    wingspan_cm = Column(Integer)
    bac_year = Column(Integer)
    bac_mention = Column(Text)  # 'TB', 'B', 'AB', 'P'
    toefl_score = Column(Integer)
    sat_score = Column(Integer)
    target_majors = Column(ARRAY(Text))
    target_divisions = Column(ARRAY(Text))  # ['D1', 'D2', 'NAIA', 'USports', 'ACAC']
    swimcloud_id = Column(Text)
    phone = Column(Text)
    updated_at = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="profile")
    performances = relationship("Performance", back_populates="swimmer", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="swimmer", cascade="all, delete-orphan")


class Performance(Base):
    __tablename__ = "performances"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    swimmer_id = Column(UUID(as_uuid=True), ForeignKey("swimmer_profiles.id", ondelete="CASCADE"))
    event_code = Column(Text, nullable=False)  # '100BR', '200FR', etc.
    basin_type = Column(Text)  # 'LCM', 'SCM', 'SCY'
    time_seconds = Column(Numeric(8, 2))
    time_raw = Column(Text)  # '1:02.41'
    date = Column(Date)
    meeting_name = Column(Text)
    fina_points = Column(Integer)
    is_pb = Column(Boolean, default=False)
    scraped_at = Column(TIMESTAMPTZ, server_default=func.now())

    swimmer = relationship("SwimmerProfile", back_populates="performances")
