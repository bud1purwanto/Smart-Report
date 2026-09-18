import pytest
from cryptography.fernet import InvalidToken
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import decrypt_password


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
