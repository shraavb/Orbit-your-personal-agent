#!/usr/bin/env python3
"""
Encrypt the contacts.json file for secure storage.

This script:
1. Reads the existing contacts.json file
2. Encrypts it using Fernet encryption
3. Saves it as contacts.json.encrypted
4. Optionally removes the plain text file

Usage:
    python encrypt_contacts.py [--remove-plaintext]
"""

import argparse
from pathlib import Path
import sys
import os

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.utils.encryption import encrypt_contacts_file, get_encryption_manager


def main():
    """Encrypt contacts.json file."""
    parser = argparse.ArgumentParser(description="Encrypt contacts.json file")
    parser.add_argument(
        "--remove-plaintext",
        action="store_true",
        help="Remove the plain text contacts.json after encryption"
    )
    parser.add_argument(
        "--contacts-path",
        type=Path,
        default=Path("backend/data/contacts.json"),
        help="Path to contacts.json file"
    )
    args = parser.parse_args()

    contacts_path = args.contacts_path

    # Check if file exists
    if not contacts_path.exists():
        print(f"❌ Error: {contacts_path} not found")
        print(f"   Make sure you're running this from the project root directory")
        sys.exit(1)

    print(f"🔒 Encrypting {contacts_path}...")

    try:
        # Get encryption manager (will generate key if needed)
        manager = get_encryption_manager()

        # Check if key was generated
        key_file = Path(".encryption_key")
        env_file = Path(".env")

        if key_file.exists():
            with open(key_file, "rb") as f:
                key = f.read().strip().decode()

            print(f"\n⚠️  IMPORTANT: Encryption key generated!")
            print(f"   Add this line to your .env file:")
            print(f"\n   ENCRYPTION_KEY={key}\n")

            if env_file.exists():
                # Check if key is already in .env
                with open(env_file, "r") as f:
                    env_content = f.read()

                if "ENCRYPTION_KEY" not in env_content:
                    print(f"   Would you like to add it automatically? (y/n): ", end="")
                    response = input().strip().lower()

                    if response == 'y':
                        with open(env_file, "a") as f:
                            f.write(f"\n# Encryption key for sensitive data\n")
                            f.write(f"ENCRYPTION_KEY={key}\n")
                        print(f"   ✅ Added ENCRYPTION_KEY to .env")
                else:
                    print(f"   ✅ ENCRYPTION_KEY already in .env")

        # Encrypt the file
        encrypted_path = encrypt_contacts_file(contacts_path)

        print(f"✅ Successfully encrypted to: {encrypted_path}")
        print(f"   File size: {encrypted_path.stat().st_size} bytes")

        # Optionally remove plain text file
        if args.remove_plaintext:
            print(f"\n⚠️  Removing plain text file: {contacts_path}")
            contacts_path.unlink()
            print(f"✅ Removed {contacts_path}")
            print(f"\n   Note: The encrypted file will be used automatically")
        else:
            print(f"\n   Plain text file kept for now.")
            print(f"   Run with --remove-plaintext to delete it after verifying encryption works")

        print(f"\n🎉 Encryption complete!")
        print(f"   Your contacts are now encrypted at rest.")

    except Exception as e:
        print(f"\n❌ Error during encryption: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
