from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class ServerProfileBase(BaseModel):
    name: str
    sid: str
    host: str
    instance: str = "00"
    client: str = "100"
    username: str
    environment: str = "development" # development, qa, production, sandbox
    is_active: bool = True
    aliases: List[str] = []
    description: Optional[str] = None

class ServerProfileCreate(ServerProfileBase):
    password: str

class ServerProfileUpdate(BaseModel):
    name: Optional[str] = None
    sid: Optional[str] = None
    host: Optional[str] = None
    instance: Optional[str] = None
    client: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    environment: Optional[str] = None
    is_active: Optional[bool] = None
    aliases: Optional[List[str]] = None
    description: Optional[str] = None

class ServerProfileResponse(ServerProfileBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ServerTestResponse(BaseModel):
    success: bool
    server_id: int
    server_name: str
    mode: str
    system_info: Optional[dict] = None
    error: Optional[str] = None
