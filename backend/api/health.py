"""Health check endpoints."""

from fastapi import APIRouter, status
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    timestamp: datetime
    version: str


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint.

    Returns the current status of the service.
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        version="0.1.0"
    )


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """
    Readiness check endpoint.

    Returns 200 if the service is ready to accept requests.
    """
    # TODO: Check database connection
    # TODO: Check Whisper model loaded
    # TODO: Check LangChain agent initialized

    return {"status": "ready"}


@router.get("/health/live", status_code=status.HTTP_200_OK)
async def liveness_check():
    """
    Liveness check endpoint.

    Returns 200 if the service is alive.
    """
    return {"status": "alive"}
