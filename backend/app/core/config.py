"""
Application configuration settings.
Uses Pydantic BaseSettings for environment variable support.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────
    APP_NAME: str = "Aura Salon Finder API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    GEMINI_API_KEY: str = ""

    # ── Database ─────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URL: str = "sqlite:///./aura.db"

    # ── JWT / Auth ───────────────────────────────────────────────
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── CORS ─────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://glow-ai-git-master-srush23.vercel.app",
        "https://auraelite-salon.netlify.app",
        "https://auraelite-salon.vercel.app",
        "https://www.auraelite-salon.vercel.app",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
