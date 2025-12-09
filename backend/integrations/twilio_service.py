"""Twilio SMS service for sending text messages."""

from typing import Optional, Dict, Any
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from backend.config import settings


class TwilioService:
    """
    Service for sending SMS messages via Twilio.

    Follows the singleton pattern with lazy initialization.
    """

    def __init__(self):
        """Initialize Twilio client with credentials from settings."""
        if not settings.twilio_account_sid or not settings.twilio_auth_token:
            raise ValueError(
                "Twilio credentials not configured. "
                "Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env"
            )

        if not settings.twilio_phone_number:
            raise ValueError(
                "Twilio phone number not configured. "
                "Please set TWILIO_PHONE_NUMBER in .env"
            )

        self.client = Client(
            settings.twilio_account_sid,
            settings.twilio_auth_token
        )
        self.from_number = settings.twilio_phone_number

        print(f"Twilio service initialized with number: {self.from_number}")

    def send_sms(self, to: str, body: str) -> Dict[str, Any]:
        """
        Send an SMS message via Twilio.

        Args:
            to: Phone number to send to (E.164 format recommended, e.g. +15551234567)
            body: Message body text

        Returns:
            Dictionary with:
                - success: bool - Whether send was successful
                - message_sid: str - Twilio message SID (if successful)
                - status: str - Twilio message status
                - error: Optional[str] - Error message (if failed)
        """
        try:
            # Send message via Twilio
            message = self.client.messages.create(
                to=to,
                from_=self.from_number,
                body=body
            )

            print(f"SMS sent successfully. SID: {message.sid}, Status: {message.status}")

            return {
                "success": True,
                "message_sid": message.sid,
                "status": message.status,
                "error": None
            }

        except TwilioRestException as e:
            # Twilio-specific errors (invalid number, insufficient balance, etc.)
            error_msg = f"Twilio error ({e.code}): {e.msg}"
            print(f"Failed to send SMS: {error_msg}")

            return {
                "success": False,
                "message_sid": None,
                "status": "failed",
                "error": error_msg
            }

        except Exception as e:
            # Generic errors
            error_msg = f"Unexpected error: {str(e)}"
            print(f"Failed to send SMS: {error_msg}")

            return {
                "success": False,
                "message_sid": None,
                "status": "failed",
                "error": error_msg
            }


# Global service instance
_twilio_service: Optional[TwilioService] = None


def get_twilio_service() -> TwilioService:
    """
    Get or create the global Twilio service instance.

    Returns:
        TwilioService instance

    Raises:
        ValueError: If Twilio credentials are not configured
    """
    global _twilio_service
    if _twilio_service is None:
        _twilio_service = TwilioService()
    return _twilio_service
