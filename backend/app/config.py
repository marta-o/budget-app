# ...existing code...
"""
config.py
- Loads settings from a .env file located at the project root.
- Uses pydantic-settings (BaseSettings moved there in Pydantic v2.12+).
- Resolves .env path relative to this file so uvicorn can be started from any CWD.
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_PATH = str(PROJECT_ROOT / ".env")

class Settings(BaseSettings):
    SQLALCHEMY_DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12

    # ensure .env is read from project root regardless of CWD
    model_config = SettingsConfigDict(env_file=ENV_PATH, env_file_encoding="utf-8")

settings = Settings()