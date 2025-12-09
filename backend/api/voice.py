"""Voice request endpoints."""

import base64
import json
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from backend.models.schemas import (
    VoiceRequest,
    VoiceResponse,
    ConfirmActionRequest,
    ConfirmActionResponse,
    RequestStatus,
    MessageType,
)
from backend.models.database import Request as RequestModel, User, Message
from backend.models.db import get_db_session
from backend.services.asr import get_asr_service
from backend.services.agent import get_agent_service
from backend.services.tts import get_tts_service
from backend.services.contacts import get_contact_service

router = APIRouter()


@router.post("/voice", response_model=VoiceResponse, status_code=status.HTTP_200_OK)
async def process_voice_request(
    request: VoiceRequest,
    db: Session = Depends(get_db_session)
):
    """
    Process a voice request.

    1. Transcribe audio (ASR)
    2. Process through LangChain agent
    3. Generate TTS response
    4. Store in database
    5. Return response
    """
    try:
        # Get services
        asr_service = get_asr_service()
        agent_service = get_agent_service()
        tts_service = get_tts_service()

        # Step 1: Transcribe audio
        transcript = asr_service.transcribe_base64(request.audio_data)

        if not transcript:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not transcribe audio. Please speak clearly and try again."
            )

        # Step 2: Process through agent
        agent_result = agent_service.process_request(
            user_input=transcript,
            metadata={
                "tags": ["voice_request"],
                "audio_format": request.audio_format,
            }
        )

        if not agent_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Agent error: {agent_result.get('error', 'Unknown error')}"
            )

        agent_response = agent_result["response"]

        # Step 3: Generate TTS
        tts_audio_base64 = await tts_service.text_to_speech_base64(agent_response)
        tts_audio_url = f"data:audio/mp3;base64,{tts_audio_base64}"

        # Step 4: Extract proposed action from agent intermediate steps
        proposed_action = None
        for step in agent_result.get("intermediate_steps", []):
            # Each step is a tuple: (AgentAction, observation)
            agent_action, observation = step
            if observation:
                try:
                    # Parse observation as JSON action proposal
                    action_data = json.loads(observation)
                    action_type = action_data.get("action_type")

                    # Check if this is a messaging action
                    if action_type in ["send_sms", "send_email", "send_slack"]:
                        proposed_action = action_data
                        # Update agent response to include confirmation message
                        confirmation_msg = action_data.get("confirmation_message")
                        if confirmation_msg:
                            agent_response = confirmation_msg
                            # Regenerate TTS with confirmation message
                            tts_audio_base64 = await tts_service.text_to_speech_base64(agent_response)
                            tts_audio_url = f"data:audio/mp3;base64,{tts_audio_base64}"
                        break
                    elif action_type == "error":
                        # Tool returned an error (e.g., contact not found)
                        error_msg = action_data.get("error_message", "An error occurred")
                        agent_response = error_msg
                        # Regenerate TTS with error message
                        tts_audio_base64 = await tts_service.text_to_speech_base64(agent_response)
                        tts_audio_url = f"data:audio/mp3;base64,{tts_audio_base64}"
                        break
                except (json.JSONDecodeError, ValueError):
                    # Not a valid JSON observation, continue
                    continue

        # Step 5: Store in database
        # Get or create default user (single user for MVP)
        user = db.query(User).first()
        if not user:
            user = User(
                name="Default User",
                email="user@orbit.local"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        db_request = RequestModel(
            user_id=user.id,
            transcript=transcript,
            agent_response=agent_response,
            agent_action=proposed_action,
            tts_audio_url=tts_audio_url,
            status=RequestStatus.PROCESSING,
            metadata={
                "run_id": agent_result.get("run_id"),
                "audio_format": request.audio_format,
            }
        )
        db.add(db_request)
        db.commit()
        db.refresh(db_request)

        # Step 6: Return response
        return VoiceResponse(
            request_id=db_request.id,
            transcript=transcript,
            agent_response=agent_response,
            tts_audio_url=tts_audio_url,
            status=RequestStatus.PROCESSING,
            proposed_action=proposed_action,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing voice request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/voice/confirm", response_model=ConfirmActionResponse)
async def confirm_action(
    request: ConfirmActionRequest,
    db: Session = Depends(get_db_session)
):
    """
    Confirm or modify a proposed action.

    This endpoint is called when the user confirms, modifies, or cancels
    a proposed action from the agent.
    """
    try:
        # Get the request from database
        db_request = db.query(RequestModel).filter(
            RequestModel.id == request.request_id
        ).first()

        if not db_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )

        # Update status based on confirmation
        if request.confirmed:
            db_request.status = RequestStatus.CONFIRMED

            # Execute the action
            execution_result = await execute_action(
                db_request.agent_action,
                db_request.id,
                db
            )

            if execution_result["success"]:
                db_request.status = RequestStatus.EXECUTED
                message = execution_result["message"]
            else:
                db_request.status = RequestStatus.FAILED
                message = f"Sorry, something went wrong: {execution_result['error']}"
        else:
            if request.modification:
                # User wants to modify
                db_request.status = RequestStatus.PROCESSING

                # Re-process modification through agent
                agent_service = get_agent_service()

                # Build context from original request
                modification_input = (
                    f"User's modification: {request.modification}. "
                    f"Original request was: {db_request.transcript}"
                )

                agent_result = agent_service.process_request(
                    user_input=modification_input,
                    metadata={"tags": ["modification", "voice_confirm"]}
                )

                # Extract new proposed action
                new_proposed_action = None
                for step in agent_result.get("intermediate_steps", []):
                    agent_action, observation = step
                    if observation:
                        try:
                            action_data = json.loads(observation)
                            action_type = action_data.get("action_type")
                            if action_type in ["send_sms", "send_email", "send_slack"]:
                                new_proposed_action = action_data
                                break
                        except (json.JSONDecodeError, ValueError):
                            continue

                # Update request with new action
                db_request.agent_response = agent_result["response"]
                db_request.agent_action = new_proposed_action
                message = agent_result["response"]
            else:
                # User cancelled
                db_request.status = RequestStatus.CANCELLED
                message = "Action cancelled."

        db.commit()

        # Generate TTS for the response
        tts_service = get_tts_service()
        tts_audio_base64 = await tts_service.text_to_speech_base64(message)
        tts_audio_url = f"data:audio/mp3;base64,{tts_audio_base64}"

        return ConfirmActionResponse(
            request_id=db_request.id,
            status=db_request.status,
            message=message,
            tts_audio_url=tts_audio_url
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error confirming action: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


async def execute_action(
    action_data: Optional[Dict[str, Any]],
    request_id: int,
    db: Session
) -> Dict[str, Any]:
    """
    Execute a confirmed action.

    Args:
        action_data: Action details from agent_action field
        request_id: Request ID for tracking
        db: Database session

    Returns:
        Execution result with success status and message
    """
    if not action_data:
        return {"success": False, "error": "No action to execute"}

    action_type = action_data.get("action_type")
    params = action_data.get("parameters", {})

    try:
        if action_type == "send_sms":
            result = await execute_sms(params, request_id, db)
        elif action_type == "send_email":
            result = await execute_email(params, request_id, db)
        elif action_type == "send_slack":
            result = await execute_slack(params, request_id, db)
        else:
            return {"success": False, "error": f"Unknown action type: {action_type}"}

        return result

    except Exception as e:
        print(f"Action execution error: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_sms(params: Dict[str, Any], request_id: int, db: Session) -> Dict[str, Any]:
    """Execute SMS sending."""
    try:
        from backend.integrations.twilio_service import get_twilio_service

        twilio_service = get_twilio_service()

        # Send via Twilio
        result = twilio_service.send_sms(
            to=params["recipient_phone"],
            body=params["message"]
        )

        # Record in database
        message = Message(
            request_id=request_id,
            message_type=MessageType.SMS,
            recipient=params["recipient_phone"],
            recipient_name=params.get("recipient_name"),
            body=params["message"],
            status="sent" if result["success"] else "failed",
            external_id=result.get("message_sid"),
            error=result.get("error"),
            sent_at=datetime.utcnow() if result["success"] else None,
            metadata=result
        )
        db.add(message)
        db.commit()

        if result["success"]:
            return {
                "success": True,
                "message": f"SMS sent to {params.get('recipient_name', params['recipient_phone'])}!"
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Failed to send SMS")
            }

    except Exception as e:
        print(f"SMS execution error: {str(e)}")
        return {"success": False, "error": f"SMS service error: {str(e)}"}


async def execute_email(params: Dict[str, Any], request_id: int, db: Session) -> Dict[str, Any]:
    """Execute email sending."""
    try:
        from backend.integrations.gmail_service import get_gmail_service

        gmail_service = get_gmail_service()

        # Send via Gmail
        result = gmail_service.send_email(
            to=params["recipient_email"],
            subject=params["subject"],
            body=params["body"]
        )

        # Record in database
        message = Message(
            request_id=request_id,
            message_type=MessageType.EMAIL,
            recipient=params["recipient_email"],
            recipient_name=params.get("recipient_name"),
            subject=params["subject"],
            body=params["body"],
            status="sent" if result["success"] else "failed",
            external_id=result.get("message_id"),
            error=result.get("error"),
            sent_at=datetime.utcnow() if result["success"] else None,
            metadata=result
        )
        db.add(message)
        db.commit()

        if result["success"]:
            return {
                "success": True,
                "message": f"Email sent to {params.get('recipient_name', params['recipient_email'])}!"
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Failed to send email")
            }

    except Exception as e:
        print(f"Email execution error: {str(e)}")
        return {"success": False, "error": f"Email service error: {str(e)}"}


async def execute_slack(params: Dict[str, Any], request_id: int, db: Session) -> Dict[str, Any]:
    """Execute Slack message sending."""
    try:
        from backend.integrations.slack_service import get_slack_service

        slack_service = get_slack_service()

        # Determine recipient (channel or user)
        recipient = params.get("channel_id") or params.get("user_id")
        if not recipient:
            return {"success": False, "error": "No channel_id or user_id specified"}

        # Send via Slack
        result = slack_service.send_message(
            channel_or_user_id=recipient,
            text=params["message"]
        )

        # Record in database
        message = Message(
            request_id=request_id,
            message_type=MessageType.SLACK,
            recipient=recipient,
            recipient_name=params.get("recipient_name"),
            body=params["message"],
            status="sent" if result["success"] else "failed",
            external_id=result.get("timestamp"),
            error=result.get("error"),
            sent_at=datetime.utcnow() if result["success"] else None,
            metadata=result
        )
        db.add(message)
        db.commit()

        if result["success"]:
            return {
                "success": True,
                "message": f"Slack message sent to {params.get('recipient_name', recipient)}!"
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Failed to send Slack message")
            }

    except Exception as e:
        print(f"Slack execution error: {str(e)}")
        return {"success": False, "error": f"Slack service error: {str(e)}"}
