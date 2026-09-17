from sqlalchemy import Column, Integer, String, DateTime, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class SavedQuery(Base):
    __tablename__ = "saved_queries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    query_json = Column(JSONB, nullable=False)
    abap_sql_preview = Column(Text, nullable=True)
    created_by = Column(String(100), default="abap_user")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    variants = relationship("ReportVariant", back_populates="query", cascade="all, delete-orphan")
    schedules = relationship("ReportSchedule", back_populates="query", cascade="all, delete-orphan")

