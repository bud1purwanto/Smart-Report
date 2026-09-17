from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint, func
from app.core.database import Base

class SapMetadataSync(Base):
    __tablename__ = "sap_metadata_sync"

    id = Column(Integer, primary_key=True, index=True)
    tablename = Column(String(30), nullable=False, index=True)
    fieldname = Column(String(30), nullable=False)
    keyflag = Column(String(1), default="")
    datatype = Column(String(10), nullable=True)
    leng = Column(Integer, default=0)
    rollname = Column(String(30), nullable=True)
    fieldtext = Column(String(255), nullable=True)
    checktable = Column(String(30), nullable=True, index=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("tablename", "fieldname", name="uq_table_field"),
    )

