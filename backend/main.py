"""Main FastAPI application for Orbit voice agent."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.config import settings
from backend.api import health, voice, contacts, user
from backend.models.db import init_db
from backend.services.asr import get_asr_service
from backend.services.agent import get_agent_service, init_agent_with_tools
from backend.services.tts import get_tts_service
from backend.services.contacts import get_contact_service
from backend.tools import SendSMSTool, SendEmailTool, SendSlackMessageTool, SendWhatsAppMessageTool


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for the FastAPI app."""
    # Startup
    print(f"Starting {settings.app_name}")
    print(f"Debug mode: {settings.debug}")

    # Initialize database
    print("Initializing database...")
    init_db()

    # Load services
    print("Loading Whisper ASR model...")
    get_asr_service()

    print("Initializing LangChain agent...")
    get_agent_service()

    print("Initializing TTS service...")
    get_tts_service()

    print("Loading contacts...")
    get_contact_service()

    # Initialize messaging integration services (conditional on API keys)
    print("Initializing messaging integrations...")
    if settings.twilio_account_sid and settings.twilio_auth_token:
        try:
            from backend.integrations.twilio_service import get_twilio_service
            get_twilio_service()
        except Exception as e:
            print(f"Warning: Twilio service initialization failed: {e}")

    if settings.gmail_credentials_file:
        try:
            from backend.integrations.gmail_service import get_gmail_service
            get_gmail_service()
        except Exception as e:
            print(f"Warning: Gmail service initialization failed: {e}")

    if settings.slack_bot_token:
        try:
            from backend.integrations.slack_service import get_slack_service
            get_slack_service()
        except Exception as e:
            print(f"Warning: Slack service initialization failed: {e}")

    # Initialize WhatsApp service (uses Twilio)
    if settings.twilio_account_sid and settings.twilio_auth_token:
        try:
            from backend.integrations.whatsapp_service import get_whatsapp_service
            get_whatsapp_service()
        except Exception as e:
            print(f"Warning: WhatsApp service initialization failed: {e}")

    # Initialize agent with messaging tools
    print("Loading messaging tools...")
    tools = [
        SendSMSTool(),
        SendEmailTool(),
        SendSlackMessageTool(),
        SendWhatsAppMessageTool(),
    ]
    init_agent_with_tools(tools)
    print(f"Agent initialized with {len(tools)} tools")

    print("Startup complete!")

    yield

    # Shutdown
    print("Shutting down...")
    # Cleanup TTS service
    tts_service = get_tts_service()
    await tts_service.close()


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Voice-first personal agent for messaging, scheduling, and more",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(voice.router, prefix="/api", tags=["voice"])
app.include_router(contacts.router, prefix="/api", tags=["contacts"])
app.include_router(user.router, prefix="/api", tags=["user"])

# Note: MCP server runs standalone on port 8001 via run_mcp_server.py


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": "0.1.0",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
