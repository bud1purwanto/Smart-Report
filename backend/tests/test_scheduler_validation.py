import pytest
from pydantic import ValidationError

from app.schemas.schedule import ScheduleCreate


def test_schedule_rejects_invalid_cron_before_persistence():
    with pytest.raises(ValidationError):
        ScheduleCreate(query_id=1, name="Broken", cron_expression="not a cron")


def test_schedule_requires_telegram_destination_when_active():
    with pytest.raises(ValidationError):
        ScheduleCreate(query_id=1, name="Missing destination", is_active=True)
