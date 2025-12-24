"""WhatsApp messaging service using Twilio API."""

from typing import Optional, Dict, Any
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from backend.config import settings


class WhatsAppService:
    """
    Service for sending WhatsApp messages via Twilio API.

    Uses Twilio's WhatsApp integration to send messages.
    Requires a Twilio WhatsApp-enabled phone number.
    """

    def __init__(self):
        """Initialize Twilio client for WhatsApp messaging."""
        if not all([settings.twilio_account_sid, settings.twilio_auth_token, settings.twilio_phone_number]):
            raise ValueError(
                "Twilio credentials not fully configured. "
                "Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env"
            )

        self.client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        self.from_number = f"whatsapp:{settings.twilio_phone_number}"

        print(f"WhatsApp service initialized with number: {settings.twilio_phone_number}")

    def send_message(
        self,
        to_phone: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Send a WhatsApp message to a phone number.

        Args:
            to_phone: Recipient's phone number (E.164 format, e.g., +1234567890)
            message: Message text to send

        Returns:
            Dictionary with:
                - success: bool - Whether send was successful
                - message_sid: str - Twilio message SID (if successful)
                - status: str - Message status
                - error: Optional[str] - Error message (if failed)
        """
        try:
            # Format recipient number for WhatsApp
            to_whatsapp = f"whatsapp:{to_phone}"

            # Send message via Twilio WhatsApp API
            message_obj = self.client.messages.create(
                from_=self.from_number,
                body=message,
                to=to_whatsapp
            )

            print(f"WhatsApp message sent successfully. SID: {message_obj.sid}, Status: {message_obj.status}")

            return {
                "success": True,
                "message_sid": message_obj.sid,
                "status": message_obj.status,
                "error": None
            }

        except TwilioRestException as e:
            # Twilio-specific errors
            error_msg = f"Twilio WhatsApp error: {e.msg}"
            print(f"Failed to send WhatsApp message: {error_msg}")

            return {
                "success": False,
                "message_sid": None,
                "status": "failed",
                "error": error_msg
            }

        except Exception as e:
            # Generic errors
            error_msg = f"Unexpected error: {str(e)}"
            print(f"Failed to send WhatsApp message: {error_msg}")

            return {
                "success": False,
                "message_sid": None,
                "status": "failed",
                "error": error_msg
            }


# Global service instance
_whatsapp_service: Optional[WhatsAppService] = None


def get_whatsapp_service() -> WhatsAppService:
    """
    Get or create the global WhatsApp service instance.

    Returns:
        WhatsAppService instance

    Raises:
        ValueError: If Twilio credentials are not configured
    """
    global _whatsapp_service
    if _whatsapp_service is None:
        _whatsapp_service = WhatsAppService()
    return _whatsapp_service
