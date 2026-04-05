from sqlalchemy import Column, String, Float, Integer, Boolean
from database import Base


class Performance(Base):
    __tablename__ = "performances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ffn_licence = Column(String, nullable=False, index=True)
    swimmer_name = Column(String)
    event_code = Column(String)    # '100BR', '50FR', etc.
    basin = Column(String)         # 'LCM' ou 'SCM'
    time_seconds = Column(Float)
    time_display = Column(String)  # '1:02.41'
    fina_points = Column(Integer)
    date = Column(String)
    meet_name = Column(String)
    club = Column(String)
    is_pb = Column(Boolean, default=False)
