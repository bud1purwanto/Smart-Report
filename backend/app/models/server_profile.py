from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base

class SapServerProfile(Base):
    __tablename__ = "sap_server_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    sid = Column(String(10), nullable=False)
    host = Column(String(255), nullable=False)
    instance = Column(String(10), nullable=False, default="00")
    client = Column(String(10), nullable=False, default="100")
    username = Column(String(100), nullable=False)
    encrypted_password = Column(Text, nullable=False)
    environment = Column(String(50), nullable=False, default="development")
    is_active = Column(Boolean, nullable=False, default=True)
    aliases = Column(JSONB, nullable=False, default=list)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

