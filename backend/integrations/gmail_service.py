"""Gmail email service for sending emails via Gmail API."""

import os
import base64
from typing import Optional, Dict, Any
from email.mime.text import MIMEText

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from backend.config import settings


# Gmail API scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.send']


class GmailService:
    """
    Service for sending emails via Gmail API.

    Follows the singleton pattern with lazy initialization.
    Handles OAuth2 authentication with token caching.
    """

    def __init__(self):
        """Initialize Gmail API client with OAuth2 credentials."""
        if not settings.gmail_credentials_file:
            raise ValueError(
                "Gmail credentials file not configured. "
                "Please set GMAIL_CREDENTIALS_FILE in .env and download OAuth2 credentials from Google Cloud Console"
            )

        self.credentials_file = settings.gmail_credentials_file
        self.token_file = settings.gmail_token_file or "backend/data/gmail_token.json"
        self.service = self._authenticate()

        print("Gmail service initialized successfully")

    def _authenticate(self):
        """
        Authenticate with Gmail API using OAuth2.

        Returns:
            Gmail API service instance
        """
        creds = None

        # Load existing token if available
        if os.path.exists(self.token_file):
            try:
                creds = Credentials.from_authorized_user_file(self.token_file, SCOPES)
            except Exception as e:
                print(f"Error loading token file: {e}")

        # If no valid credentials, authenticate
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                # Refresh expired token
                try:
                    creds.refresh(Request())
                    print("Gmail token refreshed successfully")
                except Exception as e:
                    print(f"Error refreshing token: {e}")
                    creds = None

            if not creds:
                # Run OAuth2 flow
                if not os.path.exists(self.credentials_file):
                    raise FileNotFoundError(
                        f"Gmail credentials file not found: {self.credentials_file}. "
                        "Please download OAuth2 credentials from Google Cloud Console"
                    )

                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_file, SCOPES
                )
                creds = flow.run_local_server(port=0)
                print("Gmail OAuth2 authentication completed")

            # Save token for future use
            with open(self.token_file, 'w') as token:
                token.write(creds.to_json())
                print(f"Gmail token saved to: {self.token_file}")

        # Build Gmail service
        return build('gmail', 'v1', credentials=creds)

    def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        html: bool = False
    ) -> Dict[str, Any]:
        """
        Send an email via Gmail API.

        Args:
            to: Recipient email address
            subject: Email subject line
            body: Email body text (plain text or HTML)
            html: Whether body is HTML (default: False for plain text)

        Returns:
            Dictionary with:
                - success: bool - Whether send was successful
                - message_id: str - Gmail message ID (if successful)
                - error: Optional[str] - Error message (if failed)
        """
        try:
            # Create MIME message
            message = MIMEText(body, 'html' if html else 'plain')
            message['to'] = to
            message['subject'] = subject

            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')

            # Send via Gmail API
            sent_message = self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()

            message_id = sent_message.get('id')
            print(f"Email sent successfully. Message ID: {message_id}")

            return {
                "success": True,
                "message_id": message_id,
                "error": None
            }

        except HttpError as e:
            # Gmail API-specific errors
            error_msg = f"Gmail API error ({e.resp.status}): {e.error_details}"
            print(f"Failed to send email: {error_msg}")

            return {
                "success": False,
                "message_id": None,
                "error": error_msg
            }

        except Exception as e:
            # Generic errors
            error_msg = f"Unexpected error: {str(e)}"
            print(f"Failed to send email: {error_msg}")

            return {
                "success": False,
                "message_id": None,
                "error": error_msg
            }


# Global service instance
_gmail_service: Optional[GmailService] = None


def get_gmail_service() -> GmailService:
    """
    Get or create the global Gmail service instance.

    Returns:
        GmailService instance

    Raises:
        ValueError: If Gmail credentials are not configured
        FileNotFoundError: If credentials file doesn't exist
    """
    global _gmail_service
    if _gmail_service is None:
        _gmail_service = GmailService()
    return _gmail_service
