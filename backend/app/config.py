"""
Application configuration loaded from .env file.
Uses pydantic-settings for type-safe environment variable handling.
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_PATH = str(PROJECT_ROOT / ".env")

class Settings(BaseSettings):
    """Application settings with automatic .env loading."""
    SQLALCHEMY_DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    model_config = SettingsConfigDict(env_file=ENV_PATH, env_file_encoding="utf-8")


settings = Settings()