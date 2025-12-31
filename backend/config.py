"""Configuration management for Orbit backend."""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Application
    app_name: str = "Orbit Voice Agent"
    debug: bool = False

    # Demo Mode - when True, actions simulate success without executing
    demo_mode: bool = False

    # Database
    database_url: str = "postgresql+psycopg://orbit:orbit@localhost:5432/orbit"

    # LLM & Agent
    anthropic_api_key: str
    langsmith_api_key: Optional[str] = None
    langsmith_project: str = "orbit-voice-agent"

    # TTS (ElevenLabs)
    elevenlabs_api_key: str
    elevenlabs_voice_id: Optional[str] = None  # Defaults to Rachel if not set

    # Messaging Integrations
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None

    gmail_credentials_file: Optional[str] = None
    gmail_token_file: Optional[str] = None

    slack_bot_token: Optional[str] = None
    slack_app_token: Optional[str] = None
    slack_user_token: Optional[str] = None

    # Whisper ASR
    whisper_model_size: str = "base"  # tiny, base, small, medium, large
    whisper_device: str = "cpu"  # cpu or cuda
    whisper_compute_type: str = "int8"  # int8, float16, float32

    # Contacts
    contacts_file: str = "backend/data/contacts.json"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        # Vercel deployment URLs
        "https://orbit-your-personal-agent.vercel.app",
        "https://orbit-your-personal-agent-shraavbs-projects.vercel.app",
    ]

    # Additional CORS origins (set via CORS_ORIGINS env var, comma-separated)
    cors_origins_extra: Optional[str] = None

    @property
    def cors_origins_list(self) -> list[str]:
        """Get CORS origins - combines defaults with env variable."""
        origins = list(self.cors_origins)
        env_origins = os.getenv("CORS_ORIGINS", "")
        if env_origins:
            origins.extend([origin.strip() for origin in env_origins.split(",")])
        return origins


# Global settings instance
settings = Settings()
