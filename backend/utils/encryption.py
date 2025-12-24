"""
Encryption utilities for protecting sensitive data in Orbit.

This module provides utilities for encrypting/decrypting sensitive data including:
- Contact information
- Conversation transcripts
- API tokens and credentials

Uses Fernet (symmetric encryption) from the cryptography library.
"""

import os
import json
from pathlib import Path
from typing import Any, Dict, Optional
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)


class EncryptionManager:
    """
    Manages encryption/decryption of sensitive data.

    The encryption key is stored in .env as ENCRYPTION_KEY.
    If no key exists, a new one is generated on first use.
    """

    def __init__(self, key: Optional[bytes] = None):
        """
        Initialize encryption manager.

        Args:
            key: Optional encryption key. If None, loads from environment.
        """
        if key:
            self.key = key
        else:
            self.key = self._load_or_generate_key()

        self.cipher = Fernet(self.key)
        logger.info("EncryptionManager initialized")

    def _load_or_generate_key(self) -> bytes:
        """
        Load encryption key from environment or generate a new one.

        Returns:
            Encryption key as bytes
        """
        # Try to load from environment variable
        key_str = os.getenv("ENCRYPTION_KEY")

        if key_str:
            logger.info("Loaded encryption key from ENCRYPTION_KEY environment variable")
            return key_str.encode()

        # Try to load from .encryption_key file (fallback)
        key_file = Path.cwd() / ".encryption_key"
        if key_file.exists():
            logger.info(f"Loaded encryption key from {key_file}")
            with open(key_file, "rb") as f:
                return f.read().strip()

        # Generate new key
        logger.warning("No encryption key found, generating new key")
        key = Fernet.generate_key()

        # Save to .encryption_key file
        with open(key_file, "wb") as f:
            f.write(key)

        logger.warning(f"Generated new encryption key and saved to {key_file}")
        logger.warning("IMPORTANT: Add this key to your .env file as ENCRYPTION_KEY")
        logger.warning(f"ENCRYPTION_KEY={key.decode()}")

        return key

    def encrypt(self, data: str) -> str:
        """
        Encrypt a string.

        Args:
            data: Plain text string to encrypt

        Returns:
            Encrypted string (base64 encoded)
        """
        if not data:
            return data

        encrypted_bytes = self.cipher.encrypt(data.encode())
        return encrypted_bytes.decode()

    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt a string.

        Args:
            encrypted_data: Encrypted string (base64 encoded)

        Returns:
            Decrypted plain text string
        """
        if not encrypted_data:
            return encrypted_data

        try:
            decrypted_bytes = self.cipher.decrypt(encrypted_data.encode())
            return decrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise ValueError("Failed to decrypt data. Key may be incorrect.")

    def encrypt_dict(self, data: Dict[str, Any]) -> str:
        """
        Encrypt a dictionary by converting to JSON first.

        Args:
            data: Dictionary to encrypt

        Returns:
            Encrypted JSON string
        """
        json_str = json.dumps(data)
        return self.encrypt(json_str)

    def decrypt_dict(self, encrypted_data: str) -> Dict[str, Any]:
        """
        Decrypt a JSON string back to a dictionary.

        Args:
            encrypted_data: Encrypted JSON string

        Returns:
            Decrypted dictionary
        """
        json_str = self.decrypt(encrypted_data)
        return json.loads(json_str)

    def encrypt_file(self, input_path: Path, output_path: Optional[Path] = None) -> Path:
        """
        Encrypt a file.

        Args:
            input_path: Path to file to encrypt
            output_path: Optional output path. If None, uses input_path + .encrypted

        Returns:
            Path to encrypted file
        """
        if not output_path:
            output_path = Path(str(input_path) + ".encrypted")

        with open(input_path, "rb") as f:
            data = f.read()

        encrypted_data = self.cipher.encrypt(data)

        with open(output_path, "wb") as f:
            f.write(encrypted_data)

        logger.info(f"Encrypted {input_path} -> {output_path}")
        return output_path

    def decrypt_file(self, input_path: Path, output_path: Optional[Path] = None) -> Path:
        """
        Decrypt a file.

        Args:
            input_path: Path to encrypted file
            output_path: Optional output path. If None, removes .encrypted extension

        Returns:
            Path to decrypted file
        """
        if not output_path:
            if str(input_path).endswith(".encrypted"):
                output_path = Path(str(input_path)[:-10])  # Remove .encrypted
            else:
                output_path = Path(str(input_path) + ".decrypted")

        with open(input_path, "rb") as f:
            encrypted_data = f.read()

        decrypted_data = self.cipher.decrypt(encrypted_data)

        with open(output_path, "wb") as f:
            f.write(decrypted_data)

        logger.info(f"Decrypted {input_path} -> {output_path}")
        return output_path


# Singleton instance
_encryption_manager: Optional[EncryptionManager] = None


def get_encryption_manager() -> EncryptionManager:
    """Get the global EncryptionManager instance."""
    global _encryption_manager
    if _encryption_manager is None:
        _encryption_manager = EncryptionManager()
    return _encryption_manager


def encrypt_contacts_file(contacts_path: Path) -> Path:
    """
    Encrypt the contacts.json file.

    Args:
        contacts_path: Path to contacts.json

    Returns:
        Path to encrypted file
    """
    manager = get_encryption_manager()
    return manager.encrypt_file(contacts_path)


def decrypt_contacts_file(encrypted_path: Path) -> Dict[str, Any]:
    """
    Decrypt and load contacts from encrypted file.

    Args:
        encrypted_path: Path to contacts.json.encrypted

    Returns:
        Contacts dictionary
    """
    manager = get_encryption_manager()

    # Decrypt to temporary location
    import tempfile
    with tempfile.NamedTemporaryFile(mode='r', delete=False, suffix='.json') as tmp:
        tmp_path = Path(tmp.name)

    try:
        manager.decrypt_file(encrypted_path, tmp_path)

        with open(tmp_path, 'r') as f:
            contacts = json.load(f)

        return contacts
    finally:
        # Clean up temporary file
        if tmp_path.exists():
            tmp_path.unlink()


def encrypt_field(value: str) -> str:
    """
    Encrypt a single field value.

    Args:
        value: Plain text value

    Returns:
        Encrypted value
    """
    manager = get_encryption_manager()
    return manager.encrypt(value)


def decrypt_field(encrypted_value: str) -> str:
    """
    Decrypt a single field value.

    Args:
        encrypted_value: Encrypted value

    Returns:
        Plain text value
    """
    manager = get_encryption_manager()
    return manager.decrypt(encrypted_value)
