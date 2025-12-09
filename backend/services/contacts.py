"""Contact resolution service."""

import json
from typing import Optional, Dict, Any
from pathlib import Path
from backend.config import settings


class ContactService:
    """
    Service for resolving contact names to phone numbers, emails, etc.

    Reads from a simple JSON file for MVP.
    """

    def __init__(self):
        """Initialize the contact service."""
        self.contacts_file = Path(settings.contacts_file)
        self.contacts: Dict[str, Dict[str, Any]] = {}
        self._load_contacts()

    def _load_contacts(self):
        """Load contacts from JSON file."""
        try:
            if self.contacts_file.exists():
                with open(self.contacts_file, "r") as f:
                    self.contacts = json.load(f)
                print(f"Loaded {len(self.contacts)} contacts from {self.contacts_file}")
            else:
                print(f"Contacts file not found: {self.contacts_file}")
                self.contacts = {}
        except Exception as e:
            print(f"Error loading contacts: {str(e)}")
            self.contacts = {}

    def reload_contacts(self):
        """Reload contacts from file (useful for updates)."""
        self._load_contacts()

    def get_contact(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Get contact information by name.

        Args:
            name: Contact name (case-insensitive)

        Returns:
            Contact dict or None if not found
        """
        # Case-insensitive lookup
        for contact_name, contact_info in self.contacts.items():
            if contact_name.lower() == name.lower():
                return {
                    "name": contact_name,
                    **contact_info
                }
        return None

    def get_phone(self, name: str) -> Optional[str]:
        """
        Get phone number for a contact.

        Args:
            name: Contact name

        Returns:
            Phone number or None
        """
        contact = self.get_contact(name)
        return contact.get("phone") if contact else None

    def get_email(self, name: str) -> Optional[str]:
        """
        Get email address for a contact.

        Args:
            name: Contact name

        Returns:
            Email address or None
        """
        contact = self.get_contact(name)
        return contact.get("email") if contact else None

    def get_slack_user_id(self, name: str) -> Optional[str]:
        """
        Get Slack user ID for a contact.

        Args:
            name: Contact name

        Returns:
            Slack user ID or None
        """
        contact = self.get_contact(name)
        return contact.get("slack_user_id") if contact else None

    def get_slack_channel(self, name: str) -> Optional[str]:
        """
        Get Slack channel for a contact.

        Args:
            name: Contact name

        Returns:
            Slack channel or None
        """
        contact = self.get_contact(name)
        return contact.get("slack_channel") if contact else None

    def search_contacts(self, query: str) -> list[Dict[str, Any]]:
        """
        Search contacts by partial name match.

        Args:
            query: Search query

        Returns:
            List of matching contacts
        """
        query_lower = query.lower()
        results = []

        for contact_name, contact_info in self.contacts.items():
            if query_lower in contact_name.lower() or \
               query_lower in contact_info.get("full_name", "").lower():
                results.append({
                    "name": contact_name,
                    **contact_info
                })

        return results

    def list_all_contacts(self) -> list[Dict[str, Any]]:
        """
        Get all contacts.

        Returns:
            List of all contacts
        """
        return [
            {"name": name, **info}
            for name, info in self.contacts.items()
        ]


# Global contact service instance
_contact_service: Optional[ContactService] = None


def get_contact_service() -> ContactService:
    """
    Get or create the global contact service instance.

    Returns:
        ContactService instance
    """
    global _contact_service
    if _contact_service is None:
        _contact_service = ContactService()
    return _contact_service
