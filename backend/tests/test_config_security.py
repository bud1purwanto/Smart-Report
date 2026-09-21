import pytest
from cryptography.fernet import Fernet, InvalidToken
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import decrypt_password
from app.schemas.schedule import ScheduleResponse
from datetime import datetime, timezone


def test_production_settings_require_external_secrets():
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            APP_ENV="production",
            DATABASE_URL="postgresql+psycopg://user:pass@db/report",
            SAP_GATEWAY_URL="https://mcp.internal/v1/gateway",
            SAP_GATEWAY_TOKEN="",
            SECRET_ENCRYPTION_KEY="",
        )


def test_decryption_fails_closed_for_invalid_ciphertext():
    with pytest.raises(InvalidToken):
        decrypt_password("not-a-fernet-token")


def test_production_settings_reject_wildcard_cors():
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            APP_ENV="production",
            DATABASE_URL="postgresql+psycopg://user:pass@db/report",
            SAP_GATEWAY_URL="https://mcp.internal/v1/gateway",
            SAP_GATEWAY_TOKEN="token",
            SECRET_ENCRYPTION_KEY=Fernet.generate_key().decode(),
            CORS_ORIGINS=["*"],
        )


def test_schedule_response_never_exposes_telegram_bot_token():
    now = datetime.now(timezone.utc)
    response = ScheduleResponse(
        id=1,
        query_id=1,
        name="Daily",
        telegram_chat_id="123",
        telegram_bot_token="secret-token",
        created_at=now,
        updated_at=now,
    )

    assert "telegram_bot_token" not in response.model_dump()
