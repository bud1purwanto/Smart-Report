from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class ReportSchedule(Base):
    __tablename__ = "report_schedules"

    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(Integer, ForeignKey("saved_queries.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("report_variants.id", ondelete="SET NULL"), nullable=True)
    server_id = Column(Integer, ForeignKey("sap_server_profiles.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    cron_expression = Column(String(100), nullable=False, default="0 8 * * *")
    channel = Column(String(50), nullable=False, default="telegram")
    telegram_chat_id = Column(String(100), nullable=True)
    telegram_bot_token = Column(String(255), nullable=True)
    anonymize = Column(Boolean, nullable=False, default=True)
    deduplicate = Column(Boolean, nullable=False, default=True)
    export_format = Column(String(20), nullable=False, default="xlsx")
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    last_status = Column(String(50), nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    query = relationship("SavedQuery", back_populates="schedules")
    server = relationship("SapServerProfile")
    variant = relationship("ReportVariant")

