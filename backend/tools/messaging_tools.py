"""LangChain tools for messaging actions (SMS, Email, Slack)."""

import json
from typing import Optional, Type
from pydantic import BaseModel, Field
from langchain.tools import BaseTool

from backend.services.contacts import get_contact_service


class SendSMSInput(BaseModel):
    """Input schema for SendSMSTool."""
    contact_name: str = Field(description="Name of the contact to send SMS to (e.g., 'John', 'Sarah')")
    message: str = Field(default="", description="The text message to send (optional - will ask if not provided)")


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

    def _run(self, contact_name: str, message: str = "") -> str:
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

        # Check if contact has an SMS number
        sms = contact.get("sms")
        if not sms:
            return json.dumps({
                "action_type": "error",
                "error_message": f"I don't have an SMS number for {contact.get('full_name', contact_name)}. Could you provide it?"
            })

        # NEW: Check for missing message
        if not message or message.strip() == "":
            full_name = contact.get("full_name", contact_name)
            return json.dumps({
                "action_type": "missing_params",
                "parameters": {
                    "contact_name": contact_name,
                    "recipient_phone": sms,
                    "recipient_name": full_name,
                },
                "missing_params": ["message"],
                "collected_params": {
                    "contact_name": contact_name,
                    "message": None
                },
                "question": self._get_next_question("message"),
            })

        # All params present - return action proposal
        full_name = contact.get("full_name", contact_name)
        return json.dumps({
            "action_type": "send_sms",
            "parameters": {
                "recipient_phone": sms,
                "recipient_name": full_name,
                "message": message
            },
            "confirmation_message": f"I'll send an SMS to {full_name} ({sms}): '{message}'. Should I send it?"
        })

    def _get_next_question(self, param_name: str) -> str:
        """Generate question for missing parameter."""
        questions = {
            "message": "What should the message say?",
        }
        return questions.get(param_name, f"What should the {param_name} be?")

    async def _arun(self, contact_name: str, message: str) -> str:
        """Async version (calls sync version)."""
        return self._run(contact_name, message)


class SendEmailInput(BaseModel):
    """Input schema for SendEmailTool."""
    contact_name: str = Field(description="Name of the contact to send email to (e.g., 'John', 'Team')")
    subject: str = Field(default="", description="Email subject line (optional - will ask if not provided)")
    body: str = Field(default="", description="Email body text (optional - will ask if not provided)")


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

    def _run(self, contact_name: str, subject: str = "", body: str = "") -> str:
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

        # NEW: Check for missing required parameters
        missing = []
        if not subject or subject.strip() == "":
            missing.append("subject")
        if not body or body.strip() == "":
            missing.append("body")

        if missing:
            full_name = contact.get("full_name", contact_name)
            return json.dumps({
                "action_type": "missing_params",
                "parameters": {
                    "contact_name": contact_name,
                    "recipient_email": email,
                    "recipient_name": full_name,
                },
                "missing_params": missing,
                "collected_params": {
                    "contact_name": contact_name,
                    "subject": subject if subject else None,
                    "body": body if body else None
                },
                "question": self._get_next_question(missing[0]),
            })

        # All params present - return normal confirmation
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

    def _get_next_question(self, param_name: str) -> str:
        """Generate question for missing parameter."""
        questions = {
            "subject": "What should the subject line be?",
            "body": "What should the email say?",
        }
        return questions.get(param_name, f"What should the {param_name} be?")

    async def _arun(self, contact_name: str, subject: str, body: str) -> str:
        """Async version (calls sync version)."""
        return self._run(contact_name, subject, body)


class SendSlackMessageInput(BaseModel):
    """Input schema for SendSlackMessageTool."""
    contact_name: str = Field(
        description="Name of the contact or channel to send Slack message to (e.g., 'John', 'Team')"
    )
    message: str = Field(default="", description="The Slack message text to send (optional - will ask if not provided)")
    is_channel: bool = Field(
        default=False,
        description="Whether this is a channel message (True) or direct message (False)"
    )
    mentions: Optional[list[str]] = Field(
        default=None,
        description="List of contact names to @mention in the message (e.g., ['Anna', 'Diana']). Only works for channel messages."
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
        "Use this when the user wants to send a Slack message to someone or post to a channel. "
        "Supports @mentions - if the user wants to mention specific people, provide their names in the mentions list."
    )
    args_schema: Type[BaseModel] = SendSlackMessageInput

    def _run(self, contact_name: str, message: str = "", is_channel: bool = False, mentions: Optional[list[str]] = None) -> str:
        """
        Prepare a Slack message sending proposal.

        Args:
            contact_name: Name of the contact or channel
            message: Message text to send
            is_channel: Whether this is a channel message
            mentions: List of contact names to @mention in the message

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

        # NEW: Check for missing message (before processing mentions)
        if not message or message.strip() == "":
            full_name = contact.get("full_name", contact_name)
            return json.dumps({
                "action_type": "missing_params",
                "parameters": {
                    "contact_name": contact_name,
                    "recipient_name": full_name,
                    "is_channel": is_channel,
                },
                "missing_params": ["message"],
                "collected_params": {
                    "contact_name": contact_name,
                    "is_channel": is_channel,
                    "message": None
                },
                "question": self._get_next_question("message"),
            })

        # Process mentions if provided
        mention_tags = []
        if mentions and is_channel:
            for mention_name in mentions:
                mention_contact = contact_service.get_contact(mention_name)
                if mention_contact and mention_contact.get("slack_user_id"):
                    user_id = mention_contact["slack_user_id"]
                    mention_tags.append(f"<@{user_id}>")
                else:
                    # Skip mentions we can't resolve
                    print(f"Warning: Could not resolve mention for '{mention_name}'")

        # Add mentions to the beginning of the message
        if mention_tags:
            message = " ".join(mention_tags) + " " + message

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

    def _get_next_question(self, param_name: str) -> str:
        """Generate question for missing parameter."""
        questions = {
            "message": "What should the message say?",
        }
        return questions.get(param_name, f"What should the {param_name} be?")

    async def _arun(self, contact_name: str, message: str, is_channel: bool = False, mentions: Optional[list[str]] = None) -> str:
        """Async version (calls sync version)."""
        return self._run(contact_name, message, is_channel, mentions)


class SendWhatsAppMessageInput(BaseModel):
    """Input schema for SendWhatsAppMessageTool."""
    contact_name: str = Field(description="Name of the contact to send WhatsApp message to (e.g., 'John', 'Sarah')")
    message: str = Field(default="", description="The WhatsApp message text to send (optional - will ask if not provided)")


class SendWhatsAppMessageTool(BaseTool):
    """
    Tool for proposing to send a WhatsApp message to a contact.

    Returns a JSON action proposal that requires user confirmation before execution.
    """

    name: str = "send_whatsapp_message"
    description: str = (
        "Prepare a WhatsApp message to send to a contact. "
        "This returns a proposal that requires user confirmation before the message is sent. "
        "Use this when the user wants to send a WhatsApp message to someone."
    )
    args_schema: Type[BaseModel] = SendWhatsAppMessageInput

    def _run(self, contact_name: str, message: str = "") -> str:
        """
        Prepare a WhatsApp message sending proposal.

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
                "error_message": f"I couldn't find a contact named '{contact_name}' in your contacts. Could you provide their WhatsApp phone number?"
            })

        # Check if contact has a WhatsApp phone number (use dedicated whatsapp field)
        whatsapp = contact.get("whatsapp")
        if not whatsapp:
            return json.dumps({
                "action_type": "error",
                "error_message": f"I don't have a WhatsApp number for {contact.get('full_name', contact_name)}. Could you provide it?"
            })

        # NEW: Check for missing message
        if not message or message.strip() == "":
            full_name = contact.get("full_name", contact_name)
            return json.dumps({
                "action_type": "missing_params",
                "parameters": {
                    "contact_name": contact_name,
                    "recipient_phone": whatsapp,
                    "recipient_name": full_name,
                },
                "missing_params": ["message"],
                "collected_params": {
                    "contact_name": contact_name,
                    "message": None
                },
                "question": self._get_next_question("message"),
            })

        # All params present - return action proposal
        full_name = contact.get("full_name", contact_name)
        return json.dumps({
            "action_type": "send_whatsapp",
            "parameters": {
                "recipient_phone": whatsapp,
                "recipient_name": full_name,
                "message": message
            },
            "confirmation_message": f"I'll send a WhatsApp message to {full_name} ({whatsapp}): '{message}'. Should I send it?"
        })

    def _get_next_question(self, param_name: str) -> str:
        """Generate question for missing parameter."""
        questions = {
            "message": "What should the message say?",
        }
        return questions.get(param_name, f"What should the {param_name} be?")

    async def _arun(self, contact_name: str, message: str) -> str:
        """Async version (calls sync version)."""
        return self._run(contact_name, message)
