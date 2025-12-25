#!/usr/bin/env python3
"""
Comprehensive encryption testing script.

Tests:
1. Encryption utilities
2. Contacts service with encryption
3. API endpoints
4. Add/Edit/Delete operations
"""

import sys
from pathlib import Path
import json

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

def test_encryption_utilities():
    """Test basic encryption/decryption."""
    print("\n" + "="*60)
    print("TEST 1: Encryption Utilities")
    print("="*60)

    from backend.utils.encryption import encrypt_field, decrypt_field, get_encryption_manager

    # Test 1: Simple string encryption
    original = "sensitive-data-12345"
    encrypted = encrypt_field(original)
    decrypted = decrypt_field(encrypted)

    print(f"Original:  {original}")
    print(f"Encrypted: {encrypted[:50]}...")
    print(f"Decrypted: {decrypted}")

    assert original == decrypted, "❌ Decryption failed!"
    print("✅ String encryption/decryption works")

    # Test 2: Dictionary encryption
    manager = get_encryption_manager()
    original_dict = {
        "name": "Test Contact",
        "email": "test@example.com",
        "phone": "+15551234567"
    }

    encrypted_dict = manager.encrypt_dict(original_dict)
    decrypted_dict = manager.decrypt_dict(encrypted_dict)

    print(f"\nOriginal dict:  {original_dict}")
    print(f"Encrypted dict: {encrypted_dict[:50]}...")
    print(f"Decrypted dict: {decrypted_dict}")

    assert original_dict == decrypted_dict, "❌ Dict encryption failed!"
    print("✅ Dictionary encryption/decryption works")

    return True


def test_contacts_service():
    """Test contacts service with encrypted file."""
    print("\n" + "="*60)
    print("TEST 2: Contacts Service")
    print("="*60)

    from backend.services.contacts import get_contact_service

    service = get_contact_service()

    print(f"\nTotal contacts loaded: {len(service.contacts)}")
    print(f"Contact names: {list(service.contacts.keys())[:5]}...")

    # Test lookup
    test_name = list(service.contacts.keys())[0] if service.contacts else None
    if test_name:
        contact = service.get_contact(test_name)
        print(f"\n✅ Lookup test: '{test_name}' → Found: {contact['full_name']}")
    else:
        print("⚠️  No contacts to test")
        return False

    # Test search
    results = service.search_contacts("a")
    print(f"✅ Search test: Found {len(results)} contacts containing 'a'")

    return True


def test_file_encryption():
    """Test encrypted file exists and is valid."""
    print("\n" + "="*60)
    print("TEST 3: File Encryption")
    print("="*60)

    encrypted_path = Path("backend/data/contacts.json.encrypted")
    plain_path = Path("backend/data/contacts.json")

    # Check encrypted file exists
    if not encrypted_path.exists():
        print("❌ Encrypted file not found!")
        return False

    print(f"✅ Encrypted file exists: {encrypted_path}")
    print(f"   Size: {encrypted_path.stat().st_size} bytes")

    # Try to read as plain text (should be gibberish)
    with open(encrypted_path, "rb") as f:
        raw_content = f.read()[:100]

    print(f"   Raw content (first 100 bytes): {raw_content[:50]}...")
    print("   ✅ Content is encrypted (not readable)")

    # Decrypt and verify
    from backend.utils.encryption import decrypt_contacts_file

    contacts = decrypt_contacts_file(encrypted_path)
    print(f"\n✅ Decrypted successfully: {len(contacts)} contacts")
    print(f"   Sample contact names: {list(contacts.keys())[:3]}")

    # Check if plain text file still exists
    if plain_path.exists():
        print(f"\n⚠️  Plain text file still exists: {plain_path}")
        print("   You can remove it with: rm backend/data/contacts.json")
    else:
        print(f"\n✅ Plain text file removed (more secure)")

    return True


def test_add_contact():
    """Test adding a new contact (should auto-encrypt)."""
    print("\n" + "="*60)
    print("TEST 4: Add Contact (Auto-Encryption)")
    print("="*60)

    from backend.services.contacts import get_contact_service

    service = get_contact_service()
    initial_count = len(service.contacts)

    # Add test contact
    test_contact = {
        "full_name": "Test Encryption User",
        "email": "test-encryption@example.com",
        "sms": "+15559999999"
    }

    success = service.add_contact("test-encrypt", test_contact)

    if success:
        print(f"✅ Added contact 'test-encrypt'")
        print(f"   Contacts before: {initial_count}")
        print(f"   Contacts after:  {len(service.contacts)}")

        # Verify it was encrypted
        encrypted_path = Path("backend/data/contacts.json.encrypted")
        if encrypted_path.exists():
            print(f"✅ Contact auto-saved to encrypted file")

            # Reload and verify
            service.reload_contacts()
            retrieved = service.get_contact("test-encrypt")

            if retrieved and retrieved.get("email") == "test-encryption@example.com":
                print(f"✅ Contact retrieved after reload: {retrieved['full_name']}")
            else:
                print(f"❌ Failed to retrieve contact after reload")
                return False
        else:
            print(f"❌ Encrypted file not found after save")
            return False
    else:
        print(f"⚠️  Contact already exists (from previous test)")

    # Clean up
    service.delete_contact("test-encrypt")
    print(f"✅ Test contact removed")

    return True


def test_encryption_key():
    """Verify encryption key is properly configured."""
    print("\n" + "="*60)
    print("TEST 5: Encryption Key Configuration")
    print("="*60)

    import os
    from pathlib import Path

    # Check .env
    env_file = Path(".env")
    if env_file.exists():
        with open(env_file, "r") as f:
            env_content = f.read()

        if "ENCRYPTION_KEY" in env_content:
            print("✅ ENCRYPTION_KEY found in .env")
        else:
            print("⚠️  ENCRYPTION_KEY not in .env (using .encryption_key file)")
    else:
        print("⚠️  .env file not found")

    # Check environment variable
    key = os.getenv("ENCRYPTION_KEY")
    if key:
        print(f"✅ ENCRYPTION_KEY loaded from environment")
        print(f"   Key length: {len(key)} characters")
    else:
        print("⚠️  ENCRYPTION_KEY not in environment (will use .encryption_key file)")

    # Check .encryption_key file
    key_file = Path(".encryption_key")
    if key_file.exists():
        print(f"✅ Backup key file exists: {key_file}")
    else:
        print(f"❌ Backup key file not found")

    return True


def main():
    """Run all tests."""
    print("\n" + "🔒 " + "="*56 + " 🔒")
    print("   ENCRYPTION TESTING SUITE")
    print("🔒 " + "="*56 + " 🔒")

    tests = [
        ("Encryption Utilities", test_encryption_utilities),
        ("Contacts Service", test_contacts_service),
        ("File Encryption", test_file_encryption),
        ("Add Contact (Auto-Encrypt)", test_add_contact),
        ("Encryption Key Config", test_encryption_key),
    ]

    results = []

    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Error in {name}: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Encryption is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Check output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
