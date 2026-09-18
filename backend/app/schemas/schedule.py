from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from apscheduler.triggers.cron import CronTrigger
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

    @field_validator("cron_expression")
    @classmethod
    def validate_cron_expression(cls, value: str):
        try:
            CronTrigger.from_crontab(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("cron_expression must use five-field cron syntax") from exc
        return value

    @model_validator(mode="after")
    def validate_active_destination(self):
        if self.is_active and self.channel == "telegram" and not (self.telegram_chat_id or "").strip():
            raise ValueError("telegram_chat_id is required for an active Telegram schedule")
        return self

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

    @field_validator("cron_expression")
    @classmethod
    def validate_optional_cron_expression(cls, value: Optional[str]):
        if value is None:
            return value
        try:
            CronTrigger.from_crontab(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("cron_expression must use five-field cron syntax") from exc
        return value

class ScheduleResponse(BaseModel):
    id: int
    query_id: int
    variant_id: Optional[int] = None
    server_id: Optional[int] = None
    name: str
    cron_expression: str = "0 8 * * *"
    channel: str = "telegram"
    telegram_chat_id: Optional[str] = None
    anonymize: bool = True
    deduplicate: bool = True
    export_format: str = "xlsx"
    is_active: bool = True
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    last_status: Optional[str] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
