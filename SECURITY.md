# Security Guide - Orbit Voice Agent

## Overview

Orbit implements comprehensive security measures to protect sensitive data including contacts, conversations, and API credentials. This guide explains how to configure and use these security features.

## 🔒 What's Protected

### 1. **Contact Information** (Encrypted at Rest)
- Names, phone numbers, email addresses
- Slack user IDs and channels
- WhatsApp numbers

### 2. **API Credentials** (Environment Variables)
- Anthropic Claude API key
- ElevenLabs TTS key
- Twilio account SID and auth token
- Gmail OAuth credentials and tokens
- Slack bot/user tokens

### 3. **Conversation Data** (Database)
- Voice transcripts
- Agent responses
- Proposed actions

## 🛡️ Security Features

### Encryption at Rest

Orbit uses **Fernet symmetric encryption** (from the cryptography library) to encrypt sensitive files:

- **Algorithm**: AES 128-bit in CBC mode with HMAC authentication
- **Key derivation**: Fernet keys are URL-safe base64-encoded 32-byte keys
- **Storage**: Encrypted files use `.encrypted` extension

### Files Protected

- `backend/data/contacts.json` → `contacts.json.encrypted`
- Future: Conversation transcripts (optional)
- Future: Gmail tokens (additional layer)

### Already Ignored by Git

The following sensitive files are in `.gitignore`:

```
.env
.env.local
backend/data/gmail_credentials.json
backend/data/gmail_token.json
backend/data/contacts.json
backend/data/*.encrypted
.encryption_key
*.key
```

## 🚀 Setup Guide

### Step 1: Generate Encryption Key

When you first run the encryption script or start the backend with encryption enabled, a new encryption key will be generated automatically:

```bash
python encrypt_contacts.py
```

This will:
1. Generate a new Fernet key
2. Save it to `.encryption_key` file
3. Display the key for you to add to `.env`

### Step 2: Add Key to Environment

Copy the encryption key to your `.env` file:

```bash
# .env
ENCRYPTION_KEY=<your-generated-key-here>
```

**⚠️ CRITICAL**: Never commit this key to git! The `.env` file is already in `.gitignore`.

### Step 3: Encrypt Your Contacts

```bash
# Encrypt contacts.json
python encrypt_contacts.py

# Optionally remove plain text file (after verifying)
python encrypt_contacts.py --remove-plaintext
```

This creates `backend/data/contacts.json.encrypted` which the app will use automatically.

### Step 4: Verify Encryption Works

```bash
# Start the backend
source backend/venv/bin/activate
PYTHONPATH=. python -m backend.main
```

You should see:
```
Loaded 11 contacts from backend/data/contacts.json.encrypted (encrypted)
```

## 📝 Using Encrypted Contacts

### The contacts service automatically handles encryption/decryption:

1. **Loading**: Tries encrypted file first, falls back to plain text
2. **Saving**: Automatically saves to encrypted format

### Adding New Contacts

Via API (automatically encrypted):
```bash
curl -X POST http://localhost:8000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "john",
    "full_name": "John Doe",
    "email": "john@example.com",
    "sms": "+15551234567"
  }'
```

Via UI: Use the Settings modal in the frontend (automatically encrypted)

### Manually Editing Contacts

If you need to manually edit:

1. **Option A: Decrypt, edit, re-encrypt**
   ```bash
   # Decrypt (creates contacts.json)
   python -c "from backend.utils.encryption import decrypt_contacts_file; from pathlib import Path; decrypt_contacts_file(Path('backend/data/contacts.json.encrypted'))"

   # Edit backend/data/contacts.json
   # ...

   # Re-encrypt
   python encrypt_contacts.py --remove-plaintext
   ```

2. **Option B: Use the API** (recommended)
   ```bash
   # Update contact
   curl -X PUT http://localhost:8000/api/contacts/john \
     -H "Content-Type: application/json" \
     -d '{"email": "newemail@example.com"}'
   ```

## 🔑 Key Management

### Development

- Key stored in `.encryption_key` file (git-ignored)
- Also in `.env` as `ENCRYPTION_KEY` (git-ignored)
- Both are functionally equivalent; `.env` takes precedence

### Production (Cloud Deployment)

1. **Generate key locally** (one time):
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

2. **Add to environment variables** in your cloud platform:
   - Railway: Settings → Variables → Add `ENCRYPTION_KEY`
   - Render: Environment → Add `ENCRYPTION_KEY`
   - Vercel: Settings → Environment Variables → Add `ENCRYPTION_KEY`

3. **Deploy encrypted contacts**:
   - Encrypt contacts locally: `python encrypt_contacts.py`
   - Upload `contacts.json.encrypted` to your deployed backend
   - The app will automatically decrypt using the environment variable

### Key Rotation

To rotate the encryption key:

1. **Decrypt with old key**:
   ```bash
   # Save old key
   OLD_KEY="<old-encryption-key>"

   # Decrypt contacts
   python -c "from backend.utils.encryption import EncryptionManager; from pathlib import Path; import json; mgr = EncryptionManager(b'$OLD_KEY'); contacts = mgr.decrypt_file(Path('backend/data/contacts.json.encrypted'), Path('backend/data/contacts.json'))"
   ```

2. **Generate new key**:
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

3. **Update `.env`** with new key

4. **Re-encrypt**:
   ```bash
   python encrypt_contacts.py
   ```

## 🔍 Verification

### Check What's Encrypted

```bash
# List encrypted files
ls -lh backend/data/*.encrypted

# View encrypted content (gibberish, as expected)
cat backend/data/contacts.json.encrypted
```

### Test Decryption

```bash
# Test decryption works
python -c "from backend.utils.encryption import decrypt_contacts_file; from pathlib import Path; import json; contacts = decrypt_contacts_file(Path('backend/data/contacts.json.encrypted')); print(f'✅ Decrypted {len(contacts)} contacts')"
```

## 🚨 Security Best Practices

### DO ✅

- **Keep `.env` file secure** - Never commit to git
- **Use strong encryption keys** - Generated by Fernet (cryptographically secure)
- **Rotate keys periodically** - Especially if compromised
- **Backup encryption keys** - Store securely (password manager, secrets vault)
- **Use environment variables in production** - Not files
- **Enable database encryption** - For additional protection (future enhancement)

### DON'T ❌

- **Commit `.env` to git** - Already in `.gitignore`
- **Share encryption keys** - Treat like passwords
- **Store keys in code** - Always use environment variables
- **Use same key across environments** - Dev/staging/prod should have different keys
- **Commit `contacts.json`** - Already removed from git tracking

## 📊 Threat Model

### Protected Against

| Threat | Protection | Status |
|--------|-----------|--------|
| Unauthorized git repository access | `.gitignore` + encrypted files | ✅ Active |
| Local file system access | Encryption at rest | ✅ Active |
| Database breach | Planned: Field-level encryption | ⏳ Future |
| API credential theft | Environment variables | ✅ Active |
| Man-in-the-middle | HTTPS in production | ⏳ Deploy-time |

### Not Protected Against

| Threat | Mitigation | Notes |
|--------|-----------|-------|
| Memory dumps while running | OS-level security | Runtime decryption required |
| Compromised encryption key | Key rotation | User responsibility |
| Physical server access | Cloud provider security | Use trusted providers |
| Application vulnerabilities | Code review + updates | Ongoing |

## 🔧 Troubleshooting

### "Failed to decrypt contacts"

**Cause**: Wrong encryption key or corrupted file

**Fix**:
1. Check `ENCRYPTION_KEY` in `.env` matches the key used to encrypt
2. Verify `.encryption_key` file hasn't been modified
3. Re-encrypt from backup plain text contacts

### "No contacts loaded"

**Cause**: No encrypted or plain text file found

**Fix**:
1. Check `backend/data/contacts.json.encrypted` exists
2. Or create `backend/data/contacts.json` from template
3. Run `python encrypt_contacts.py`

### "ModuleNotFoundError: backend.utils.encryption"

**Cause**: Virtual environment not activated or wrong directory

**Fix**:
```bash
source backend/venv/bin/activate
PYTHONPATH=. python encrypt_contacts.py
```

## 📚 Additional Resources

### Database Encryption (Future)

For encrypting database fields:

```python
from backend.utils.encryption import encrypt_field, decrypt_field

# Encrypt before storing
encrypted_transcript = encrypt_field(user_transcript)
db.execute("INSERT INTO requests (transcript) VALUES (?)", [encrypted_transcript])

# Decrypt after retrieving
encrypted_value = db.query("SELECT transcript FROM requests").first()
decrypted_transcript = decrypt_field(encrypted_value)
```

### API Integration

The encryption utilities are designed to work seamlessly:

- **Contacts API**: Auto-encrypts on create/update
- **Frontend**: Transparent - no changes needed
- **MCP Server**: Reads encrypted contacts automatically

## 📞 Support

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email: [your-security-email]
3. Or use GitHub Security Advisories

---

**Last Updated**: December 23, 2025
**Version**: 1.0.0
