"""Slack messaging service for sending messages via Slack API."""

from typing import Optional, Dict, Any
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from backend.config import settings


class SlackService:
    """
    Service for sending messages via Slack API.

    Follows the singleton pattern with lazy initialization.
    Supports sending to channels and direct messages to users.
    """

    def __init__(self):
        """Initialize Slack client with user token (preferred) or bot token from settings."""
        # Prefer user token for personal messages, fall back to bot token
        if settings.slack_user_token:
            token = settings.slack_user_token
            token_type = "user"
        elif settings.slack_bot_token:
            token = settings.slack_bot_token
            token_type = "bot"
        else:
            raise ValueError(
                "No Slack token configured. "
                "Please set SLACK_USER_TOKEN or SLACK_BOT_TOKEN in .env"
            )

        self.client = WebClient(token=token)
        self.token_type = token_type

        # Verify token by testing auth
        try:
            auth_response = self.client.auth_test()
            self.user_id = auth_response["user_id"]
            self.team_name = auth_response["team"]
            print(f"Slack service initialized for team: {self.team_name} ({token_type} token, user: {self.user_id})")
        except SlackApiError as e:
            raise ValueError(f"Failed to authenticate with Slack: {e.response['error']}")

    def send_message(
        self,
        channel_or_user_id: str,
        text: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Send a message to a Slack channel or user.

        Args:
            channel_or_user_id: Channel ID (e.g., #general, C123ABC) or User ID (U123ABC)
            text: Message text (supports Slack markdown)
            **kwargs: Additional arguments to pass to chat.postMessage (e.g., blocks, attachments)

        Returns:
            Dictionary with:
                - success: bool - Whether send was successful
                - timestamp: str - Message timestamp (if successful)
                - channel: str - Channel ID where message was sent
                - error: Optional[str] - Error message (if failed)
        """
        try:
            # Send message via Slack API
            response = self.client.chat_postMessage(
                channel=channel_or_user_id,
                text=text,
                **kwargs
            )

            timestamp = response["ts"]
            channel = response["channel"]

            print(f"Slack message sent successfully. Channel: {channel}, TS: {timestamp}")

            return {
                "success": True,
                "timestamp": timestamp,
                "channel": channel,
                "error": None
            }

        except SlackApiError as e:
            # Slack API-specific errors
            error_code = e.response.get("error", "unknown")
            error_msg = f"Slack API error: {error_code}"

            # Provide helpful error messages
            if error_code == "channel_not_found":
                error_msg = "Channel or user not found. Please check the ID."
            elif error_code == "not_in_channel":
                error_msg = "Bot is not in the channel. Please invite the bot first."
            elif error_code == "is_archived":
                error_msg = "Channel is archived and cannot receive messages."

            print(f"Failed to send Slack message: {error_msg}")

            return {
                "success": False,
                "timestamp": None,
                "channel": None,
                "error": error_msg
            }

        except Exception as e:
            # Generic errors
            error_msg = f"Unexpected error: {str(e)}"
            print(f"Failed to send Slack message: {error_msg}")

            return {
                "success": False,
                "timestamp": None,
                "channel": None,
                "error": error_msg
            }

    def lookup_user_by_email(self, email: str) -> Optional[str]:
        """
        Look up a Slack user ID by email address.

        Args:
            email: User's email address

        Returns:
            User ID if found, None otherwise
        """
        try:
            response = self.client.users_lookupByEmail(email=email)
            user_id = response["user"]["id"]
            print(f"Found Slack user ID for {email}: {user_id}")
            return user_id
        except SlackApiError as e:
            print(f"User lookup failed for {email}: {e.response['error']}")
            return None


# Global service instance
_slack_service: Optional[SlackService] = None


def get_slack_service() -> SlackService:
    """
    Get or create the global Slack service instance.

    Returns:
        SlackService instance

    Raises:
        ValueError: If Slack bot token is not configured or invalid
    """
    global _slack_service
    if _slack_service is None:
        _slack_service = SlackService()
    return _slack_service
