import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator, model_validator
from cryptography.fernet import Fernet

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Report"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    APP_ENV: str = Field(default="development", validation_alias="APP_ENV")
    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v):
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "debug", "dev")
        return bool(v)

    # Database
    DATABASE_URL: str = Field(
        validation_alias="DATABASE_URL"
    )
    DB_SCHEMA: str = Field(default="smart_report", validation_alias="DB_SCHEMA")

    # SAP Gateway MCP
    SAP_GATEWAY_URL: str = Field(
        validation_alias="SAP_GATEWAY_URL"
    )
    SAP_GATEWAY_TOKEN: str = Field(
        validation_alias="SAP_GATEWAY_TOKEN"
    )
    SAP_MCP_READ_TOOL: str = Field(default="sap-leader-mcp__read_table", validation_alias="SAP_MCP_READ_TOOL")
    SAP_MCP_SYSTEM_INFO_TOOL: str = Field(default="sap-leader-mcp__get_system_info", validation_alias="SAP_MCP_SYSTEM_INFO_TOOL")
    SAP_MCP_TIMEOUT_SECONDS: float = Field(default=45.0, ge=1.0, le=300.0)

    # Security
    SECRET_ENCRYPTION_KEY: str = Field(
        validation_alias="SECRET_ENCRYPTION_KEY"
    )

    @field_validator("DATABASE_URL", "SAP_GATEWAY_URL", "SAP_GATEWAY_TOKEN", "SECRET_ENCRYPTION_KEY")
    @classmethod
    def reject_missing_runtime_config(cls, value: str, info):
        if not value or not value.strip():
            raise ValueError(f"{info.field_name} must be supplied through runtime configuration")
        return value.strip()

    @field_validator("SECRET_ENCRYPTION_KEY")
    @classmethod
    def validate_fernet_key(cls, value: str):
        try:
            Fernet(value.encode("utf-8"))
        except (TypeError, ValueError) as exc:
            raise ValueError("SECRET_ENCRYPTION_KEY must be a valid Fernet key") from exc
        return value

    @model_validator(mode="after")
    def reject_unsafe_production_settings(self):
        if self.APP_ENV.lower() == "production":
            if "*" in self.CORS_ORIGINS:
                raise ValueError("CORS_ORIGINS cannot contain '*' in production")
            if self.DEBUG:
                raise ValueError("DEBUG must be false in production")
        return self

    # AI Engine
    OLLAMA_BASE_URL: str = Field(
        default="http://localhost:11434",
        validation_alias="OLLAMA_BASE_URL"
    )
    OLLAMA_MODEL: str = Field(default="qwen2.5:3b", validation_alias="OLLAMA_MODEL")
    OPENAI_API_KEY: str = Field(default="", validation_alias="OPENAI_API_KEY")

    # Telegram
    TELEGRAM_BOT_TOKEN: str = Field(default="", validation_alias="TELEGRAM_BOT_TOKEN")
    TELEGRAM_DEFAULT_CHAT_ID: str = Field(default="", validation_alias="TELEGRAM_DEFAULT_CHAT_ID")

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
