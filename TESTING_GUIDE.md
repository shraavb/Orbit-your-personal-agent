# Orbit Voice Agent - Testing Guide

## Integration Test Results

### ✅ What's Working
1. **Configuration** - All API keys properly configured
2. **Contacts System** - 3 contacts loaded (John, Sarah, Team)
3. **Error Handling** - API gracefully handles invalid inputs
4. **Backend Service** - Running on port 8000
5. **Frontend Service** - Running on port 5173

### ⚠️  Known Issues from Automated Tests
1. **Health Endpoint** - Looking for `/health` but it's at `/api/health`
2. **Mock Audio** - Test audio data doesn't work with Whisper (expected - real audio needed)

## Manual Testing Scenarios

### Prerequisites
- Backend running: `./start_backend.sh`
- Frontend running: `cd frontend && npm run dev`
- Open browser: http://localhost:5173/

### Test Scenarios

#### 1. Basic Conversation (No Action)
**Input:** "Hi Orbit, how are you?"
**Expected:**
- ✅ Audio transcribed correctly
- ✅ Friendly response from agent
- ✅ Voice response plays
- ✅ No action proposed

#### 2. SMS to Valid Contact (John)
**Input:** "Send John a text saying I'll be 10 minutes late"
**Expected:**
- ✅ Audio transcribed
- ✅ Agent proposes SMS action
- ✅ Shows: "Send SMS to John Smith (+15551234567): 'I'll be 10 minutes late'"
- ✅ Confirmation required before sending
**Data:**
- Recipient: John Smith
- Phone: +15551234567
- Message: "I'll be 10 minutes late"

#### 3. Email to Valid Contact (Sarah)
**Input:** "Email Sarah about the meeting tomorrow with subject 'Meeting Update'"
**Expected:**
- ✅ Audio transcribed
- ✅ Agent proposes email action
- ✅ Shows: "Send email to Sarah Johnson (sarah.johnson@example.com)"
- ✅ Confirmation required
**Data:**
- Recipient: Sarah Johnson
- Email: sarah.johnson@example.com
- Subject: "Meeting Update"

#### 4. Slack to Team Channel
**Input:** "Post to the engineering team that the deployment is complete"
**Expected:**
- ✅ Audio transcribed
- ✅ Agent proposes Slack action
- ✅ Shows: "Post to #engineering channel"
- ✅ Confirmation required
**Data:**
- Recipient: Engineering Team
- Channel: #engineering

#### 5. Invalid Contact Handling
**Input:** "Send Anna a text message"
**Expected:**
- ✅ Audio transcribed
- ✅ Agent responds with error message
- ✅ Message: "I couldn't find a contact named 'Anna'"
- ⚠️ No action proposed

#### 6. Contact Without Required Field
**Input:** "Send Team a text message"
**Expected:**
- ✅ Audio transcribed
- ✅ Agent responds with error
- ✅ Message: "Team doesn't have a phone number"
- ⚠️ No action proposed

#### 7. Multi-turn Conversation
**Input 1:** "What can you do?"
**Input 2:** "Can you send a message to John?"
**Expected:**
- ✅ Context maintained
- ✅ Agent understands reference

## Potential Issues & Solutions

### 1. Database Column Size
**Issue:** TTS audio data too large for VARCHAR(500)
**Status:** ✅ FIXED - Changed to TEXT type
**File:** `backend/models/database.py:63`

### 2. Environment Variable Override
**Issue:** Shell environment variables override .env file
**Status:** ✅ FIXED - Created `start_backend.sh` script
**Solution:** Always use `./start_backend.sh` to start backend

###  3. Structured Response Format
**Issue:** Claude returns structured format `[{'text': '...', 'type': 'text'}]`
**Status:** ✅ FIXED - Extract text before TTS
**File:** `backend/api/voice.py:75-77`

### 4. API Key Validation
**Issue:** Invalid API keys cause 401 errors
**Status:** ✅ VERIFIED - All keys valid in .env
**Keys Checked:**
- ANTHROPIC_API_KEY
- ELEVENLABS_API_KEY
- LANGSMITH_API_KEY
- TWILIO credentials
- SLACK tokens

## System Architecture

### Complete Workflow

```
User Speech
    ↓
[1] Audio Recording (Frontend - MediaRecorder API)
    ↓
[2] Base64 Encoding
    ↓
[3] POST /api/voice
    ↓
[4] Whisper ASR (Transcription)
    ↓
[5] Claude Agent (LangChain)
    ├─ Context understanding
    ├─ Tool selection
    └─ Response generation
    ↓
[6] Tool Execution (if needed)
    ├─ SendSMSTool
    ├─ SendEmailTool
    └─ SendSlackMessageTool
    ↓
[7] Contact Resolution
    ├─ Look up contact name
    ├─ Get phone/email/slack ID
    └─ Return action proposal
    ↓
[8] ElevenLabs TTS (Voice synthesis)
    ↓
[9] Database Storage
    ├─ Request record
    ├─ Transcript
    ├─ Agent response
    ├─ Proposed action
    └─ TTS audio
    ↓
[10] Return Response
    ├─ request_id
    ├─ transcript
    ├─ agent_response
    ├─ tts_audio_url
    ├─ status
    └─ proposed_action
    ↓
[11] Frontend Display
    ├─ Show transcript
    ├─ Play TTS audio
    └─ Show confirmation UI (if action)
    ↓
[12] User Confirmation (if needed)
    ↓
[13] POST /api/voice/confirm
    ├─ Execute action
    ├─ Record in messages table
    └─ Return success/failure
```

## Error Handling Points

### 1. Audio Input
- **Empty audio** → 400 Bad Request
- **Invalid base64** → 500 Internal Server Error (Whisper)
- **Too short** → Transcription may be empty

### 2. Transcription
- **Whisper fails** → 500 with error message
- **Empty transcript** → 400 "Could not transcribe audio"

### 3. Agent Processing
- **Claude API error** → 500 Internal Server Error
- **Tool execution error** → Returned in agent response

### 4. Contact Resolution
- **Contact not found** → Error action type with message
- **Missing field** → Error action type (e.g., no phone)

### 5. TTS Generation
- **ElevenLabs API error** → 500 Internal Server Error
- **Invalid API key** → 401 Unauthorized

### 6. Database
- **Connection error** → 500 Internal Server Error
- **Data too large** → Fixed (TEXT column)

### 7. Message Execution
- **Twilio error** → Recorded in messages table with error field
- **Gmail error** → OAuth token refresh or error
- **Slack error** → Invalid channel/user or auth error

## API Endpoints

### GET /
**Response:** Welcome message and version

### GET /api/health
**Response:**
```json
{
  "status": "healthy",
  "service": "Orbit Voice Agent",
  "version": "0.1.0"
}
```

### POST /api/voice
**Request:**
```json
{
  "audio_data": "base64_encoded_audio",
  "audio_format": "webm"
}
```

**Response:**
```json
{
  "request_id": 1,
  "transcript": "User's speech transcribed",
  "agent_response": "Agent's text response",
  "tts_audio_url": "data:audio/mp3;base64,...",
  "status": "PROCESSING",
  "proposed_action": {
    "action_type": "send_sms",
    "parameters": {
      "recipient_phone": "+15551234567",
      "recipient_name": "John Smith",
      "message": "I'll be late"
    },
    "confirmation_message": "I'll send SMS to John..."
  }
}
```

### POST /api/voice/confirm
**Request:**
```json
{
  "request_id": 1,
  "confirmed": true,
  "modification": null
}
```

**Response:**
```json
{
  "request_id": 1,
  "status": "EXECUTED",
  "message": "SMS sent to John Smith!",
  "tts_audio_url": "data:audio/mp3;base64,..."
}
```

## Database Tables

### users
- id, name, email, created_at, updated_at

### requests
- id, user_id, audio_url, transcript, agent_response
- agent_action (JSON), tts_audio_url (TEXT - fixed!)
- status, created_at, updated_at, metadata

### messages
- id, request_id, message_type (SMS/EMAIL/SLACK)
- recipient, recipient_name, subject, body
- external_id, status, error, sent_at, metadata

## Performance Benchmarks

- **Whisper ASR**: ~2-3 seconds (base model, CPU)
- **Claude Agent**: ~1-2 seconds
- **ElevenLabs TTS**: ~1-2 seconds
- **Total**: ~5-7 seconds per request

## Security Considerations

### ✅ Implemented
- CORS middleware (localhost only)
- API keys in .env (not in code)
- Database prepared statements (SQLAlchemy)
- Error messages don't leak sensitive info

### ⚠️  To Consider for Production
- Rate limiting
- User authentication
- API key rotation
- Encrypted audio storage
- Message audit log
- HTTPS only
- Input validation (length limits)

## Troubleshooting

### Issue: "Failed to load resource: 500"
**Check:**
1. Backend running? `ps aux | grep "backend.main"`
2. Correct API keys? `cat .env | grep API_KEY`
3. Database running? `docker ps | grep postgres`
4. Check logs in terminal running backend

### Issue: Empty transcript
**Solution:** Hold microphone button longer (2-3 seconds minimum)

### Issue: No audio plays
**Check:**
1. ElevenLabs API key valid?
2. Check browser console for errors
3. Check backend logs for TTS errors

### Issue: Contact not found
**Solution:** Add contact to `backend/data/contacts.json`

### Issue: Action not executing
**Check:**
1. Did you click "Confirm"?
2. Check integration API keys (Twilio/Gmail/Slack)
3. Check backend logs for execution errors

## Running Tests

### Automated Integration Tests
```bash
python test_integration.py
```

### Manual Tests
Use the browser at http://localhost:5173/ with the scenarios above

### Unit Tests (Future)
```bash
pytest backend/tests/ -v
```

## Next Steps

1. ✅ Test basic conversation
2. ✅ Test SMS action with John
3. ✅ Test email action with Sarah
4. ✅ Test Slack action with Team
5. ✅ Test error handling
6. ⚠️  Add more contacts if needed
7. ⚠️  Test actual message sending (requires valid phone/email)
8. ⚠️  Add more tools (calendar, reminders, etc.)

## Success Criteria

- [ ] Voice transcription works consistently
- [ ] Agent responds appropriately
- [ ] TTS audio plays correctly
- [ ] Actions are proposed correctly
- [ ] Confirmation flow works
- [ ] Messages are sent successfully
- [ ] Errors are handled gracefully
- [ ] Database records all interactions

## Contact Configuration

Current contacts in `backend/data/contacts.json`:

```json
{
  "John": {
    "full_name": "John Smith",
    "phone": "+15551234567",
    "email": "john.smith@example.com"
  },
  "Sarah": {
    "full_name": "Sarah Johnson",
    "phone": "+15559876543",
    "email": "sarah.johnson@example.com"
  },
  "Team": {
    "full_name": "Engineering Team",
    "email": "team@example.com",
    "slack_channel": "#engineering"
  }
}
```

To add new contacts, edit this file and restart the backend.
