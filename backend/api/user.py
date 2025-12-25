"""User management endpoints."""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from backend.models.database import User
from backend.models.db import get_db_session

router = APIRouter()


class UserResponse(BaseModel):
    """User information response."""
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class UpdateUserRequest(BaseModel):
    """Request to update user information."""
    name: str = Field(..., min_length=1, max_length=100, description="User's name")


@router.get("/user", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_user(db: Session = Depends(get_db_session)):
    """
    Get the current user's information.

    For MVP, returns the single user in the system.
    Creates default user if none exists.
    """
    user = db.query(User).first()

    if not user:
        # Create default user (for local testing)
        user = User(
            name="Shraav",
            email="user@orbit.local"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


@router.put("/user", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_user(
    request: UpdateUserRequest,
    db: Session = Depends(get_db_session)
):
    """
    Update the current user's information.

    For MVP, updates the single user in the system.
    """
    user = db.query(User).first()

    if not user:
        # Create user if doesn't exist (for local testing)
        user = User(
            name=request.name,
            email="user@orbit.local"
        )
        db.add(user)
    else:
        # Update existing user
        user.name = request.name

    db.commit()
    db.refresh(user)

    return user
