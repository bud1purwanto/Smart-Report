from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class ReportVariant(Base):
    __tablename__ = "report_variants"

    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(Integer, ForeignKey("saved_queries.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    column_order = Column(JSONB, nullable=False, default=list)
    hidden_columns = Column(JSONB, nullable=False, default=list)
    filter_parameters = Column(JSONB, nullable=False, default=dict)
    sort_parameters = Column(JSONB, nullable=False, default=list)
    custom_columns = Column(JSONB, nullable=False, default=list)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    query = relationship("SavedQuery", back_populates="variants")

