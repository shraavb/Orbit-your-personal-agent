"""LangChain tools for messaging actions (SMS, Email, Slack)."""

import json
from typing import Optional, Type
from pydantic import BaseModel, Field
from langchain.tools import BaseTool

from backend.services.contacts import get_contact_service


class SendSMSInput(BaseModel):
    """Input schema for SendSMSTool."""
    contact_name: str = Field(description="Name of the contact to send SMS to (e.g., 'John', 'Sarah')")
    message: str = Field(description="The text message to send")


class SendSMSTool(BaseTool):
    """
    Tool for proposing to send an SMS message to a contact.

    Returns a JSON action proposal that requires user confirmation before execution.
    """

    name: str = "send_sms"
    description: str = (
        "Prepare an SMS text message to send to a contact. "
        "This returns a proposal that requires user confirmation before the message is sent. "
        "Use this when the user wants to send a text message to someone."
    )
    args_schema: Type[BaseModel] = SendSMSInput

    def _run(self, contact_name: str, message: str) -> str:
        """
        Prepare an SMS sending proposal.

        Args:
            contact_name: Name of the contact
            message: Message text to send

        Returns:
            JSON string with action proposal
        """
        contact_service = get_contact_service()

        # Look up contact
        contact = contact_service.get_contact(contact_name)

        if not contact:
            # Contact not found - ask user for phone number
            return json.dumps({
                "action_type": "error",
                "error_message": f"I couldn't find a contact named '{contact_name}' in your contacts. Could you provide their phone number?"
            })

        # Check if contact has a phone number
        phone = contact.get("phone")
        if not phone:
            return json.dumps({
                "action_type": "error",
                "error_message": f"I don't have a phone number for {contact.get('full_name', contact_name)}. Could you provide it?"
            })

        # Return action proposal
        full_name = contact.get("full_name", contact_name)
        return json.dumps({
            "action_type": "send_sms",
            "parameters": {
                "recipient_phone": phone,
                "recipient_name": full_name,
                "message": message
            },
            "confirmation_message": f"I'll send an SMS to {full_name} ({phone}): '{message}'. Should I send it?"
        })

    async def _arun(self, contact_name: str, message: str) -> str:
        """Async version (calls sync version)."""
        return self._run(contact_name, message)


class SendEmailInput(BaseModel):
    """Input schema for SendEmailTool."""
    contact_name: str = Field(description="Name of the contact to send email to (e.g., 'John', 'Team')")
    subject: str = Field(description="Email subject line")
    body: str = Field(description="Email body text")


class SendEmailTool(BaseTool):
    """
    Tool for proposing to send an email to a contact.

    Returns a JSON action proposal that requires user confirmation before execution.
    """

    name: str = "send_email"
    description: str = (
        "Prepare an email to send to a contact. "
        "This returns a proposal that requires user confirmation before the email is sent. "
        "Use this when the user wants to send an email to someone."
    )
    args_schema: Type[BaseModel] = SendEmailInput

    def _run(self, contact_name: str, subject: str, body: str) -> str:
        """
        Prepare an email sending proposal.

        Args:
            contact_name: Name of the contact
            subject: Email subject
            body: Email body text

        Returns:
            JSON string with action proposal
        """
        contact_service = get_contact_service()

        # Look up contact
        contact = contact_service.get_contact(contact_name)

        if not contact:
            # Contact not found
            return json.dumps({
                "action_type": "error",
                "error_message": f"I couldn't find a contact named '{contact_name}' in your contacts. Could you provide their email address?"
            })

        # Check if contact has an email
        email = contact.get("email")
        if not email:
            return json.dumps({
                "action_type": "error",
                "error_message": f"I don't have an email address for {contact.get('full_name', contact_name)}. Could you provide it?"
            })

        # Return action proposal
        full_name = contact.get("full_name", contact_name)
        return json.dumps({
            "action_type": "send_email",
            "parameters": {
                "recipient_email": email,
                "recipient_name": full_name,
                "subject": subject,
                "body": body
            },
            "confirmation_message": f"I'll send an email to {full_name} ({email}) with subject '{subject}'. Should I send it?"
        })

    async def _arun(self, contact_name: str, subject: str, body: str) -> str:
        """Async version (calls sync version)."""
        return self._run(contact_name, subject, body)


class SendSlackMessageInput(BaseModel):
    """Input schema for SendSlackMessageTool."""
    contact_name: str = Field(
        description="Name of the contact or channel to send Slack message to (e.g., 'John', 'Team')"
    )
    message: str = Field(description="The Slack message text to send")
    is_channel: bool = Field(
        default=False,
        description="Whether this is a channel message (True) or direct message (False)"
    )


class SendSlackMessageTool(BaseTool):
    """
    Tool for proposing to send a Slack message to a contact or channel.

    Returns a JSON action proposal that requires user confirmation before execution.
    """

    name: str = "send_slack_message"
    description: str = (
        "Prepare a Slack message to send to a user or channel. "
        "This returns a proposal that requires user confirmation before the message is sent. "
        "Use this when the user wants to send a Slack message to someone or post to a channel."
    )
    args_schema: Type[BaseModel] = SendSlackMessageInput

    def _run(self, contact_name: str, message: str, is_channel: bool = False) -> str:
        """
        Prepare a Slack message sending proposal.

        Args:
            contact_name: Name of the contact or channel
            message: Message text to send
            is_channel: Whether this is a channel message

        Returns:
            JSON string with action proposal
        """
        contact_service = get_contact_service()

        # Look up contact
        contact = contact_service.get_contact(contact_name)

        if not contact:
            # Contact not found
            return json.dumps({
                "action_type": "error",
                "error_message": f"I couldn't find a contact named '{contact_name}' in your contacts. Could you provide their Slack user ID or channel?"
            })

        # Determine if this is a channel or user message
        if is_channel:
            # Channel message
            slack_channel = contact.get("slack_channel")
            if not slack_channel:
                return json.dumps({
                    "action_type": "error",
                    "error_message": f"I don't have a Slack channel for {contact.get('full_name', contact_name)}. Could you provide it?"
                })

            full_name = contact.get("full_name", contact_name)
            return json.dumps({
                "action_type": "send_slack",
                "parameters": {
                    "channel_id": slack_channel,
                    "recipient_name": full_name,
                    "message": message,
                    "is_channel": True
                },
                "confirmation_message": f"I'll post to Slack channel {slack_channel}: '{message}'. Should I send it?"
            })
        else:
            # Direct message to user
            slack_user_id = contact.get("slack_user_id")
            if not slack_user_id:
                return json.dumps({
                    "action_type": "error",
                    "error_message": f"I don't have a Slack user ID for {contact.get('full_name', contact_name)}. Could you provide it?"
                })

            full_name = contact.get("full_name", contact_name)
            return json.dumps({
                "action_type": "send_slack",
                "parameters": {
                    "user_id": slack_user_id,
                    "recipient_name": full_name,
                    "message": message,
                    "is_channel": False
                },
                "confirmation_message": f"I'll send a Slack DM to {full_name}: '{message}'. Should I send it?"
            })

    async def _arun(self, contact_name: str, message: str, is_channel: bool = False) -> str:
        """Async version (calls sync version)."""
        return self._run(contact_name, message, is_channel)
