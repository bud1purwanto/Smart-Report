import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart SQVI Web"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

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
        default="postgresql+psycopg://postgres:postgres@192.168.1.232:5432/ABAP_DB",
        validation_alias="DATABASE_URL"
    )
    DB_SCHEMA: str = Field(default="smart_report", validation_alias="DB_SCHEMA")

    # SAP Gateway MCP
    SAP_GATEWAY_URL: str = Field(
        default="http://192.168.1.161:4000/v1/gateway",
        validation_alias="SAP_GATEWAY_URL"
    )
    SAP_GATEWAY_TOKEN: str = Field(
        default="d216fa1a7457408f0fc51e7a8876fb352a425c7103c9e9be0c6f1d02e9d8399f",
        validation_alias="SAP_GATEWAY_TOKEN"
    )

    # Security
    SECRET_ENCRYPTION_KEY: str = Field(
        default="kXwz5yO7fH_W3P81XG_Mh_lq9Jq6zZ7kL8pC9rA3xY0=",
        validation_alias="SECRET_ENCRYPTION_KEY"
    )

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
