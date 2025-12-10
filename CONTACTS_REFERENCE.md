# Orbit Contact Reference

## Available Contacts (12 total)

### Personal Contacts

#### Mom (Maria Garcia)
- **Phone:** +15551234567 ✅
- **Email:** maria.garcia@email.com ✅
- **Slack:** ❌
- **Test:** "Send Mom a text saying I'll be home for dinner"

#### Dad (Robert Garcia)
- **Phone:** +15551234568 ✅
- **Email:** robert.garcia@email.com ✅
- **Slack:** ❌
- **Test:** "Email Dad about the weekend plans"

### Work Contacts - Full Profile

#### Sarah (Sarah Johnson)
- **Phone:** +15559876543 ✅
- **Email:** sarah.johnson@company.com ✅
- **Slack:** U01234ABCDE ✅
- **Test:** "Send Sarah a Slack message about the meeting"

#### John (John Smith)
- **Phone:** +15551234569 ✅
- **Email:** john.smith@company.com ✅
- **Slack:** U98765FGHIJ ✅
- **Test:** "Text John that I'm running 5 minutes late"

#### Boss (Michael Chen)
- **Phone:** +15559998888 ✅
- **Email:** michael.chen@company.com ✅
- **Slack:** U11111AAAAA ✅
- **Test:** "Email my boss about the project update"

#### Anna (Anna Martinez)
- **Phone:** +15557778888 ✅
- **Email:** anna.martinez@company.com ✅
- **Slack:** U22222BBBBB ✅
- **Test:** "Send Anna a text saying thanks for the help"

#### Alex (Alex Thompson)
- **Phone:** +15556667777 ✅
- **Email:** alex.thompson@company.com ✅
- **Slack:** ❌
- **Test:** "Email Alex about the code review"

### Work Contacts - Partial Profile

#### Rachel (Rachel Kim)
- **Phone:** ❌
- **Email:** rachel.kim@company.com ✅
- **Slack:** U33333CCCCC ✅
- **Test:**
  - ✅ "Email Rachel about the design"
  - ✅ "Slack Rachel the update"
  - ❌ "Text Rachel" (will error - no phone)

#### Mike (Mike Davis)
- **Phone:** +15554445555 ✅
- **Email:** ❌
- **Slack:** ❌
- **Test:**
  - ✅ "Send Mike a text message"
  - ❌ "Email Mike" (will error - no email)

### Team Channels

#### Engineering Team
- **Phone:** ❌
- **Email:** engineering@company.com ✅
- **Slack:** #engineering ✅
- **Test:**
  - ✅ "Post to engineering that the deploy is done"
  - ✅ "Email engineering team about the outage"
  - ❌ "Text the engineering team" (will error - no phone)

#### Team (Project Team)
- **Phone:** ❌
- **Email:** team@company.com ✅
- **Slack:** #general ✅
- **Test:** "Slack the team about the standup time change"

#### Design Team
- **Phone:** ❌
- **Email:** design@company.com ✅
- **Slack:** #design ✅
- **Test:** "Post to design channel about the mockups"

## Testing Scenarios

### ✅ Should Work

1. **SMS to contact with phone**
   - "Send Mom a text saying I love you"
   - "Text John I'm running late"
   - "Send Mike a message about the meeting"

2. **Email to contact with email**
   - "Email Sarah about the project"
   - "Send Boss an email with subject 'Update'"
   - "Email engineering team about the deployment"

3. **Slack to contact/channel with Slack ID**
   - "Slack Sarah the update"
   - "Post to engineering that we're done"
   - "Send Anna a Slack DM about lunch"

### ❌ Should Error Gracefully

1. **SMS to contact without phone**
   - "Text Rachel" → Error: "Rachel doesn't have a phone number"
   - "Send the engineering team a text" → Error: "No phone number"

2. **Email to contact without email**
   - "Email Mike" → Error: "Mike doesn't have an email"

3. **Slack to contact without Slack**
   - "Slack Mike" → Error: "Mike doesn't have Slack"

4. **Non-existent contact**
   - "Text Bob" → Error: "Couldn't find Bob in contacts"

## Contact Lookup Behavior

### Name Matching
- **Case insensitive:** "sarah" = "Sarah" = "SARAH"
- **Exact match required:** "Sara" ≠ "Sarah"
- **First name only:** "Mom", "Dad", "Boss", "Sarah", etc.

### Contact Resolution Flow

```
User says: "Send Sarah a text"
    ↓
1. Look up "Sarah" in contacts.json
    ↓
2. Found: Sarah Johnson
    ↓
3. Check for phone number
    ↓
4. Phone found: +15559876543
    ↓
5. Return action proposal:
   {
     "action_type": "send_sms",
     "parameters": {
       "recipient_phone": "+15559876543",
       "recipient_name": "Sarah Johnson",
       "message": "..."
     },
     "confirmation_message": "I'll send SMS to Sarah Johnson (+15559876543): '...'. Should I send it?"
   }
```

## Adding New Contacts

Edit `backend/data/contacts.json`:

```json
{
  "ContactName": {
    "full_name": "Full Name",
    "phone": "+1234567890",      // or null
    "email": "email@domain.com",  // or null
    "slack_user_id": "U123ABC",   // for DMs, or null
    "slack_channel": "#channel"   // for channels, or null
  }
}
```

**Important:**
- At least ONE of phone/email/slack_user_id/slack_channel must be present
- Phone numbers should be in E.164 format: +1234567890
- Slack user IDs start with 'U': U01234ABCDE
- Slack channels start with '#': #engineering

After adding contacts, restart the backend:
```bash
./start_backend.sh
```

## Voice Command Examples

### Natural Language Patterns

The agent understands various phrasings:

**SMS:**
- "Send [name] a text saying [message]"
- "Text [name] that [message]"
- "Send [name] a message: [message]"

**Email:**
- "Email [name] about [subject]"
- "Send [name] an email with subject [subject] and body [body]"
- "Email [name]: [body]"

**Slack:**
- "Slack [name] that [message]"
- "Send [name] a Slack message: [message]"
- "Post to [channel] that [message]"
- "Send a DM to [name] on Slack: [message]"

## Integration Status

### SMS (Twilio)
- ✅ Configured
- ✅ API Keys set
- ⚠️ Test mode (won't actually send unless you confirm)

### Email (Gmail)
- ✅ Configured
- ✅ OAuth credentials set
- ⚠️ Requires OAuth authorization on first use

### Slack
- ✅ Configured
- ✅ Bot token set
- ⚠️ Bot must be invited to channels

## Quick Test Checklist

- [ ] "Send Mom a text saying hello" (SMS)
- [ ] "Email Sarah about the meeting" (Email)
- [ ] "Slack John the update" (Slack DM)
- [ ] "Post to engineering team" (Slack channel)
- [ ] "Text Rachel" (Should error - no phone)
- [ ] "Email Mike" (Should error - no email)
- [ ] "Text Bob" (Should error - contact not found)

## Notes

- All phone numbers are fake (555 prefix)
- Email addresses use example domains
- Slack user IDs are mock IDs
- For production: Replace with real contact information
- The agent will ALWAYS ask for confirmation before sending
