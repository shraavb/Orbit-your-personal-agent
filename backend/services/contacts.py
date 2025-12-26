"""Contact resolution service."""

import json
from typing import Optional, Dict, Any
from pathlib import Path
from difflib import SequenceMatcher
from backend.config import settings
import logging

logger = logging.getLogger(__name__)


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
        """
        Load contacts from JSON file.

        Supports both encrypted and plain text formats:
        1. Try encrypted file first (contacts.json.encrypted)
        2. Fall back to plain text (contacts.json)
        3. If neither exists, return empty dict
        """
        encrypted_file = Path(str(self.contacts_file) + ".encrypted")

        try:
            # Try encrypted file first
            if encrypted_file.exists():
                try:
                    from backend.utils.encryption import decrypt_contacts_file
                    self.contacts = decrypt_contacts_file(encrypted_file)
                    logger.info(f"Loaded {len(self.contacts)} contacts from encrypted file: {encrypted_file}")
                    print(f"Loaded {len(self.contacts)} contacts from {encrypted_file} (encrypted)")
                    return
                except Exception as e:
                    logger.error(f"Failed to decrypt contacts: {e}")
                    logger.warning("Falling back to plain text contacts.json")

            # Fall back to plain text
            if self.contacts_file.exists():
                with open(self.contacts_file, "r") as f:
                    self.contacts = json.load(f)
                logger.info(f"Loaded {len(self.contacts)} contacts from {self.contacts_file}")
                print(f"Loaded {len(self.contacts)} contacts from {self.contacts_file}")
            else:
                logger.warning(f"No contacts file found (tried {encrypted_file} and {self.contacts_file})")
                print(f"Contacts file not found: {self.contacts_file}")
                self.contacts = {}

        except Exception as e:
            logger.error(f"Error loading contacts: {str(e)}", exc_info=True)
            print(f"Error loading contacts: {str(e)}")
            self.contacts = {}

    def reload_contacts(self):
        """Reload contacts from file (useful for updates)."""
        self._load_contacts()

    def get_contact(self, name: str, user_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get contact information by name with fuzzy matching.

        Matching logic:
        1. Check if name is a self-reference (me, myself, I) and resolve to user
        2. Try exact match first (case-insensitive)
        3. Try partial match (name contains query or query contains name)
        4. If multiple matches, return only if they're the same person (same full_name)

        Args:
            name: Contact name (case-insensitive, can be partial)
            user_name: Current user's name for self-reference resolution (optional)

        Returns:
            Contact dict or None if not found or ambiguous
        """
        name_lower = name.lower().strip()
        print(f"Contact lookup: searching for '{name}' (normalized: '{name_lower}')")

        # Handle self-references (me, myself, I)
        self_references = ['me', 'myself', 'i', 'my self']
        if name_lower in self_references:
            if user_name:
                print(f"Self-reference detected: '{name}' -> resolving to user '{user_name}'")
                name_lower = user_name.lower()
                name = user_name
            else:
                print(f"Self-reference detected but no user_name provided, trying to find user in contacts")
                # Fallback: try to find contact with name containing "Shraav" (the current user)
                for contact_name, contact_info in self.contacts.items():
                    if 'shraav' in contact_name.lower():
                        print(f"Found user contact: {contact_name}")
                        return {
                            "name": contact_name,
                            **contact_info
                        }
                print("Could not resolve self-reference - no user found in contacts")
                return None

        # Step 1: Try exact match first
        for contact_name, contact_info in self.contacts.items():
            if contact_name.lower() == name_lower:
                return {
                    "name": contact_name,
                    **contact_info
                }

        # Step 2: Try fuzzy/partial matching using similarity score
        matches = []
        best_score = 0.0
        similarity_threshold = 0.7  # 70% similarity required

        for contact_name, contact_info in self.contacts.items():
            contact_lower = contact_name.lower()

            # Calculate similarity using SequenceMatcher
            similarity = SequenceMatcher(None, name_lower, contact_lower).ratio()

            # Also check substring matching (for cases like "Mum" -> "Mummy")
            is_substring = name_lower in contact_lower or contact_lower in name_lower

            # Match if similarity is high enough OR it's a substring
            if similarity >= similarity_threshold or is_substring:
                print(f"Fuzzy match: '{name}' matched '{contact_name}' (similarity: {similarity:.2f}, substring: {is_substring})")
                matches.append({
                    "name": contact_name,
                    "similarity": similarity,
                    **contact_info
                })
                best_score = max(best_score, similarity)

        # If we have matches, keep only the best ones (within 10% of best score)
        if matches:
            matches = [m for m in matches if m.get("similarity", 0) >= best_score - 0.1]

        # Step 3: Handle matches
        if len(matches) == 0:
            return None
        elif len(matches) == 1:
            # Single match - return it
            return matches[0]
        else:
            # Multiple matches - check if they're all the same person
            # (same full_name means duplicate entries for same person)
            full_names = set(m.get("full_name") for m in matches)
            if len(full_names) == 1:
                # All matches have same full_name - they're the same person
                # Return the first match
                return matches[0]
            else:
                # Different people with similar names - ambiguous
                # Return None to trigger asking for clarification
                print(f"Ambiguous contact name '{name}' matches: {[m['name'] for m in matches]}")
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

    def add_contact(self, name: str, contact_data: Dict[str, Any]) -> bool:
        """
        Add a new contact.

        Args:
            name: Contact short name/alias
            contact_data: Contact details dict

        Returns:
            True if successful, False if name already exists
        """
        if name in self.contacts:
            return False

        self.contacts[name] = contact_data
        self._save_contacts()
        return True

    def update_contact(self, name: str, contact_data: Dict[str, Any]) -> bool:
        """
        Update an existing contact.

        Args:
            name: Contact short name/alias
            contact_data: Updated contact details (partial updates supported)

        Returns:
            True if successful, False if contact not found
        """
        if name not in self.contacts:
            return False

        # Merge with existing data
        self.contacts[name].update({k: v for k, v in contact_data.items() if v is not None})
        self._save_contacts()
        return True

    def delete_contact(self, name: str) -> bool:
        """
        Delete a contact.

        Args:
            name: Contact short name/alias

        Returns:
            True if successful, False if contact not found
        """
        if name not in self.contacts:
            return False

        del self.contacts[name]
        self._save_contacts()
        return True

    def _save_contacts(self):
        """
        Save contacts to JSON file.

        Saves to encrypted format if encryption is available.
        Falls back to plain text if encryption fails.
        """
        try:
            # Ensure directory exists
            self.contacts_file.parent.mkdir(parents=True, exist_ok=True)

            # Try to save encrypted
            encrypted_file = Path(str(self.contacts_file) + ".encrypted")

            try:
                from backend.utils.encryption import get_encryption_manager
                import tempfile

                # Write to temp file first
                with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as tmp:
                    json.dump(self.contacts, tmp, indent=2)
                    tmp_path = Path(tmp.name)

                # Encrypt the temp file
                manager = get_encryption_manager()
                manager.encrypt_file(tmp_path, encrypted_file)

                # Clean up temp file
                tmp_path.unlink()

                logger.info(f"Saved {len(self.contacts)} contacts to {encrypted_file} (encrypted)")
                print(f"Saved {len(self.contacts)} contacts to {encrypted_file} (encrypted)")

            except Exception as e:
                logger.warning(f"Failed to save encrypted contacts: {e}")
                logger.info("Falling back to plain text save")

                # Fall back to plain text
                with open(self.contacts_file, "w") as f:
                    json.dump(self.contacts, f, indent=2)

                print(f"Saved {len(self.contacts)} contacts to {self.contacts_file}")

        except Exception as e:
            logger.error(f"Error saving contacts: {str(e)}", exc_info=True)
            print(f"Error saving contacts: {str(e)}")
            raise


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
