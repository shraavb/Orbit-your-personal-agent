# Slack App Setup for Orbit

This guide explains how to set up your Slack app using the provided manifest file.

## Quick Setup

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Select **"From an app manifest"**
4. Choose your workspace
5. Copy and paste the contents of `slack-manifest.yaml`
6. Review the configuration and click **"Create"**
7. Install the app to your workspace

## Getting Your Tokens

After creating the app:

1. **Bot Token** (required):
   - Go to **"OAuth & Permissions"** in the left sidebar
   - Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)
   - Add to your `.env` file: `SLACK_BOT_TOKEN=xoxb-...`

2. **App Token** (optional, for future socket mode):
   - Go to **"Basic Information"**
   - Scroll to **"App-Level Tokens"**
   - Click **"Generate Token and Scopes"**
   - Add the `connections:write` scope
   - Copy the token (starts with `xapp-`)
   - Add to your `.env` file: `SLACK_APP_TOKEN=xapp-...`

## Current Permissions Explained

Your Orbit agent currently needs these permissions:

| Permission | Purpose | Required? |
|------------|---------|-----------|
| `chat:write` | Send messages to channels and users | ✅ Yes |
| `users:read` | List all users in workspace | ✅ Yes |
| `users:read.email` | Look up user IDs by email | ✅ Yes |

## Inviting the Bot to Channels

Before Orbit can send messages to a channel, you must invite it:

1. Open the channel in Slack
2. Type `/invite @Orbit`
3. The bot will join and can now send messages there

For direct messages, no invitation is needed - the bot can DM any user.

## Optional Features (Currently Commented Out)

The manifest includes commented sections for features you might want to add:

### Event Subscriptions
Uncomment these to enable **inbound** message handling (currently Orbit only sends messages):
- `app_mentions:read` - Respond when someone @mentions Orbit
- `message.channels` - Read messages in channels
- `message.im` - Read direct messages

**Note:** Enabling events requires setting up a webhook endpoint in your backend.

### Slash Commands
Uncomment to add commands like `/orbit [request]` for quick interactions.

### Socket Mode
If you prefer real-time events without webhook URLs, enable socket mode and use the `SLACK_APP_TOKEN`.

## Architecture Notes

Your current implementation:
- ✅ **Outbound only** - Sends messages via `chat.postMessage`
- ✅ **Voice-first** - User speaks → Agent processes → Confirms → Sends to Slack
- ✅ **No webhooks needed** - No inbound event handling
- ✅ **Simple setup** - Just needs bot token and channel invitations

## Testing Your Setup

Run the included script to verify your configuration:

```bash
python get_slack_users.py
```

This will:
- Test your `SLACK_BOT_TOKEN`
- List all users in your workspace
- Display their names and IDs for `contacts.json`

## Troubleshooting

**Error: "channel_not_found"**
- Make sure you've invited the bot to the channel: `/invite @Orbit`

**Error: "not_in_channel"**
- The bot needs to be a member of the channel to post there

**Error: "invalid_auth"**
- Check that `SLACK_BOT_TOKEN` is correctly set in `.env`
- Verify the token starts with `xoxb-`

**Error: "missing_scope"**
- Reinstall the app in your workspace after updating the manifest
- Go to **OAuth & Permissions** → **Reinstall App**

## Security Best Practices

1. **Never commit tokens** - Keep `.env` in `.gitignore`
2. **Rotate tokens regularly** - Generate new tokens periodically
3. **Limit permissions** - Only enable scopes you actually need
4. **Monitor usage** - Check your app's activity in Slack settings

## Next Steps

1. Update `backend/data/contacts.json` with Slack user IDs:
   ```json
   {
     "Anna": {
       "slack_user_id": "U0A2GPB2XC4",
       "email": "anna@example.com"
     }
   }
   ```

2. Test sending a message through Orbit's voice interface

3. Consider adding event subscriptions if you want bidirectional communication
