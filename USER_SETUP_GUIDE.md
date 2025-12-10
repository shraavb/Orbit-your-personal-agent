# Orbit Voice Agent - User Setup Guide

## First-Time Setup

This guide will help you set up Orbit for your Slack workspace and contacts.

## Prerequisites

- Slack workspace admin access (for bot setup)
- Email accounts you want to integrate
- Phone numbers for SMS (optional - Twilio account required)

## Step 1: Slack Bot Setup

### 1.1 Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "Orbit" and select your workspace
4. Click "Create App"

### 1.2 Configure Bot Permissions

1. Go to "OAuth & Permissions" in the sidebar
2. Scroll to "Scopes" → "Bot Token Scopes"
3. Add these scopes:
   - `chat:write` - Send messages as bot
   - `chat:write.public` - Send messages to channels without joining
   - `users:read` - Read user information
   - `channels:read` - View channels
   - `groups:read` - View private channels
   - `im:write` - Send direct messages
   - `mpim:write` - Send group messages

4. Scroll up and click "Install to Workspace"
5. Authorize the app
6. **Copy the "Bot User OAuth Token"** (starts with `xoxb-`)

### 1.3 Get App-Level Token (for Socket Mode - optional)

1. Go to "Basic Information"
2. Scroll to "App-Level Tokens"
3. Click "Generate Token and Scopes"
4. Name it "Orbit Token"
5. Add scope: `connections:write`
6. Click "Generate"
7. **Copy the token** (starts with `xapp-`)

### 1.4 Add Bot to Channels

For channel messaging to work, add the bot to each channel:

```
/invite @Orbit
```

Or from channel settings → Integrations → Add Apps

## Step 2: Get Slack User IDs

You need Slack User IDs for direct messaging. Here are 3 ways to get them:

### Method 1: Manual (Quick)

For each person you want to message:
1. Right-click their profile in Slack
2. Select "View profile"
3. Click the "..." menu → "Copy member ID"
4. Save the ID (format: `U01234ABCDE`)

### Method 2: Using Slack Web

1. Open Slack in browser
2. Click on a person's name
3. Look at the URL: `https://yourworkspace.slack.com/team/U01234ABCDE`
4. The ID is the part after `/team/`

### Method 3: Using API (if you added users:read scope)

Run the included script:

```bash
python get_slack_users.py
```

This will list all users with their IDs.

## Step 3: Configure Contacts

Edit `backend/data/contacts.json`:

```json
{
  "Anna": {
    "full_name": "Anna Smith",
    "phone": "+15551234567",
    "email": "anna@example.com",
    "slack_user_id": "U01234ABCDE"
  },
  "Engineering": {
    "full_name": "Engineering Team",
    "phone": null,
    "email": "eng@company.com",
    "slack_channel": "#engineering"
  }
}
```

### Contact Fields:

- **full_name** (required): Display name
- **phone** (optional): Phone number in E.164 format (`+15551234567`)
- **email** (optional): Email address
- **slack_user_id** (optional): For Slack DMs (format: `U01234ABCDE`)
- **slack_channel** (optional): For Slack channels (format: `#channel-name`)

**Important:** Each contact must have at least ONE method (phone, email, OR slack).

## Step 4: Update Environment Variables

Edit `.env` file:

```bash
# Slack Configuration
SLACK_BOT_TOKEN="xoxb-your-bot-token-here"
SLACK_APP_TOKEN="xapp-your-app-token-here"  # optional
```

## Step 5: Restart Backend

After updating contacts or environment variables:

```bash
# Stop the backend (Ctrl+C)
# Then restart:
./start_backend.sh
```

Or if using docker-compose:

```bash
docker-compose restart backend
```

## Step 6: Test Your Setup

### Test 1: Basic Conversation
**Say:** "Hi Orbit, how are you?"
**Expected:** Friendly greeting response

### Test 2: Slack DM
**Say:** "Send Anna a Slack message saying hello"
**Expected:** Confirmation request with Anna's name

### Test 3: Slack Channel
**Say:** "Post to the engineering channel that the deploy is complete"
**Expected:** Confirmation request for #engineering

### Test 4: Email
**Say:** "Email Anna about the meeting tomorrow"
**Expected:** Confirmation request with email address

### Test 5: Error Handling
**Say:** "Send Bob a message" (if Bob doesn't exist)
**Expected:** Error message: "I couldn't find Bob in contacts"

## Common Issues

### Issue: "I don't have a Slack user ID for [name]"

**Solution:**
1. Get the user's member ID from Slack (see Step 2)
2. Add it to `contacts.json` as `slack_user_id`
3. Restart backend

### Issue: "Slack API error: channel_not_found"

**Solution:**
1. Invite the bot to the channel: `/invite @Orbit`
2. Verify channel name matches exactly (including `#`)

### Issue: "Slack API error: missing_scope"

**Solution:**
1. Go to Slack App settings → OAuth & Permissions
2. Add the required scope (check error message)
3. Reinstall app to workspace
4. Update `SLACK_BOT_TOKEN` in `.env`
5. Restart backend

### Issue: Bot sends messages but can't read users

**Solution:** Add `users:read` scope in Slack app settings and reinstall.

## Adding New Contacts

1. Get their Slack user ID (see Step 2)
2. Add to `contacts.json`:

```json
{
  "NewPerson": {
    "full_name": "New Person Name",
    "phone": null,
    "email": "newperson@example.com",
    "slack_user_id": "U98765ZYXWV"
  }
}
```

3. Restart backend: `./start_backend.sh`
4. Test: "Send NewPerson a message"

## Quick Reference

### Voice Commands

**Slack DM:**
- "Send [name] a Slack message saying [message]"
- "Slack [name] that [message]"
- "DM [name] on Slack: [message]"

**Slack Channel:**
- "Post to [channel] that [message]"
- "Send a message to the [channel] channel: [message]"
- "Post in [channel]: [message]"

**Email:**
- "Email [name] about [subject]"
- "Send [name] an email saying [message]"

**SMS:**
- "Text [name] that [message]"
- "Send [name] a text: [message]"

### Contact Lookup

Orbit recognizes contacts by first name or nickname. Make sure:
- Contact names are unique
- Names match what you'll say verbally
- Use simple, easy-to-pronounce names

### File Locations

- **Contacts:** `backend/data/contacts.json`
- **Environment:** `.env`
- **Logs:** Check terminal running `./start_backend.sh`

## Security Notes

- Never commit `.env` file to git (it contains API keys)
- Slack tokens should be kept secret
- Use environment variables in production
- Regularly rotate API keys
- Review Slack bot permissions periodically

## Support

If you encounter issues:

1. Check backend logs for errors
2. Verify all API keys are set correctly in `.env`
3. Ensure Slack bot has proper permissions
4. Test with curl: `curl http://localhost:8000/api/health`
5. Check `TESTING_GUIDE.md` for troubleshooting

## Next Steps

Once setup is complete:

1. Test all your contacts
2. Invite Orbit bot to all needed channels
3. Train your team on voice commands
4. Add more contacts as needed
5. Consider setting up additional integrations (calendar, etc.)

---

**Congratulations!** 🎉 Your Orbit voice agent is now configured!

Try: "Hi Orbit, send Anna a Slack message saying the setup is complete!"
