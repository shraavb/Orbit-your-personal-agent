# 🧪 Encryption Testing Guide

## Quick Start - Run All Tests Now!

```bash
# Automated tests (5 tests in ~2 seconds)
python test_encryption.py
```

✅ **All 5/5 tests passed!** (Already verified above)

---

## Manual Testing - Step by Step

### Test 1: Backend with Encrypted Contacts ⚡ (30 seconds)

**Start the backend and verify it loads encrypted contacts:**

```bash
# Kill any running backend
lsof -ti:8000 | xargs kill -9

# Start backend
source backend/venv/bin/activate
PYTHONPATH=. python -m backend.main
```

**Look for this line**:
```
Loaded 11 contacts from backend/data/contacts.json.encrypted (encrypted)
```

✅ **Pass**: Message includes "(encrypted)"  
❌ **Fail**: Shows plain path or decryption error

---

### Test 2: Voice Agent Test ⚡ (2 minutes)

**Test with your voice:**

1. Keep backend running from Test 1
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:5173
4. Click microphone and say: **"Send an email to Mummy"**

**Expected**:
```
✅ You said: Send an email to Mummy
✅ Orbit: I'll send an email to Mummy (prayagi@yahoo.com)...
```

✅ **Pass**: Contact found from encrypted file  
❌ **Fail**: Contact not found or error

---

### Test 3: API Test ⚡ (30 seconds)

```bash
# List all contacts
curl http://localhost:8000/api/contacts | jq '.total'
```

**Expected**: Returns `11` (or your contact count)

✅ **Pass**: Returns correct count  
❌ **Fail**: Error or wrong count

---

### Test 4: Add Contact Test ⚡ (1 minute)

```bash
# Add test contact
curl -X POST http://localhost:8000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"name":"test","full_name":"Test User","email":"test@test.com"}'

# Verify it was added
curl http://localhost:8000/api/contacts/test | jq .
```

**Expected**: Returns the test contact

**Verify encryption**:
```bash
# File should have been updated (check timestamp)
ls -lh backend/data/contacts.json.encrypted
```

**Cleanup**:
```bash
curl -X DELETE http://localhost:8000/api/contacts/test
```

✅ **Pass**: Contact added, encrypted file updated  
❌ **Fail**: Error or file not updated

---

### Test 5: Verify Encryption ⚡ (10 seconds)

```bash
# Try to read encrypted file (should be unreadable)
head -c 100 backend/data/contacts.json.encrypted
```

**Expected**: Gibberish like `gAAAAABpS3DO6gX3SsXW...`

❌ **CRITICAL FAIL**: If you see readable names/emails!  
✅ **Pass**: Unreadable encrypted data

