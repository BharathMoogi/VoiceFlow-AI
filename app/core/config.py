from pydantic_settings import BaseSettings
from pydantic import PostgresDsn, model_validator
from typing import Optional
from sqlalchemy import Column, DateTime, func

class Settings(BaseSettings):
    PROJECT_NAME: str = "VoiceFlow-AI"

    # PostgreSQL Database configuration
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "voiceflow_db"

    # Supabase IPv4 pooler URL — used as default if DATABASE_URL env var is not set
    DATABASE_URL: Optional[str] = (
        "postgresql+asyncpg://postgres.peupumasgzqraqgieqmd:Moogibharath"
        "@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?ssl=true"
    )

    @model_validator(mode="after")
    def assemble_db_connection(self) -> "Settings":
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
                f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        else:
            if self.DATABASE_URL.startswith("postgres://"):
                self.DATABASE_URL = self.DATABASE_URL.replace(
                    "postgres://", "postgresql+asyncpg://"
                )
            elif self.DATABASE_URL.startswith("postgresql://"):
                self.DATABASE_URL = self.DATABASE_URL.replace(
                    "postgresql://", "postgresql+asyncpg://"
                )
            # Replace sslmode=require with ssl=require for asyncpg compatibility
            if "sslmode=require" in self.DATABASE_URL:
                self.DATABASE_URL = self.DATABASE_URL.replace("sslmode=require", "ssl=require")
        return self

    # JWT Settings
    SECRET_KEY: str = "changeme"  # Default secret for JWT
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days in minutes
    EMAIL_VERIFICATION_URL: Optional[str] = "http://localhost:8000/verify-email"
    RATE_LIMIT: str = "100/minute"

    # Gemini Settings
    GEMINI_API_KEY: Optional[str] = None

    # SMTP / Email Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_USE_TLS: bool = True          # STARTTLS on port 587
    SMTP_USE_SSL: bool = False         # SSL on port 465

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
