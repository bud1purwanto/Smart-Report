from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class ScheduleBase(BaseModel):
    query_id: int
    variant_id: Optional[int] = None
    server_id: Optional[int] = None
    name: str
    cron_expression: str = "0 8 * * *"
    channel: str = "telegram"
    telegram_chat_id: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    anonymize: bool = True
    deduplicate: bool = True
    export_format: str = "xlsx"
    is_active: bool = True

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    variant_id: Optional[int] = None
    server_id: Optional[int] = None
    cron_expression: Optional[str] = None
    channel: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    anonymize: Optional[bool] = None
    deduplicate: Optional[bool] = None
    export_format: Optional[str] = None
    is_active: Optional[bool] = None

class ScheduleResponse(ScheduleBase):
    id: int
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    last_status: Optional[str] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
