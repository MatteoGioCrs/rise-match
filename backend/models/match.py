from sqlalchemy import (
    Column, Integer, Numeric, Text, BigInteger, ForeignKey, ARRAY, Boolean
)
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMPTZ, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Match(Base):
    __tablename__ = "matches"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    swimmer_id = Column(UUID(as_uuid=True), ForeignKey("swimmer_profiles.id", ondelete="CASCADE"))
    university_id = Column(Integer, ForeignKey("universities.id"))
    gender = Column(Text)
    score_vacancy = Column(Numeric(5, 2))
    score_conf = Column(Numeric(5, 2))
    score_conversion = Column(Numeric(5, 2))
    score_relay = Column(Numeric(5, 2))
    score_academic = Column(Numeric(5, 2))
    score_progress = Column(Numeric(5, 2))
    fit_score = Column(Numeric(5, 2), nullable=False)
    scholarship_est = Column(Numeric(5, 2))
    vacancy_detail = Column(JSONB)
    relay_detail = Column(JSONB)
    computed_at = Column(TIMESTAMPTZ, server_default=func.now())

    swimmer = relationship("SwimmerProfile", back_populates="matches")
    university = relationship("University", back_populates="matches")

    __table_args__ = (
        __import__("sqlalchemy").UniqueConstraint("swimmer_id", "university_id", "gender"),
    )


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    swimmer_id = Column(UUID(as_uuid=True), ForeignKey("swimmer_profiles.id"))
    university_id = Column(Integer, ForeignKey("universities.id"))
    recipient_emails = Column(ARRAY(Text))
    subject = Column(Text)
    body_html = Column(Text)
    sent_at = Column(TIMESTAMPTZ, server_default=func.now())
    resend_id = Column(Text)
    opened = Column(Boolean, default=False)
    replied = Column(Boolean, default=False)
