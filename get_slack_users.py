#!/usr/bin/env python3
"""
Script to fetch Slack user IDs for contacts.
"""
import os
import json
from dotenv import load_dotenv
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

# Load environment variables
load_dotenv()

def get_slack_users():
    """Fetch all users from Slack workspace."""
    token = os.getenv("SLACK_BOT_TOKEN")

    if not token:
        print("❌ SLACK_BOT_TOKEN not found in .env file")
        return

    client = WebClient(token=token)

    try:
        print("Fetching Slack users...\n")
        response = client.users_list()

        users = response["members"]

        print(f"Found {len(users)} users in workspace:\n")
        print("-" * 80)

        # Filter out bots and deleted users
        real_users = []
        for user in users:
            if not user.get("deleted", False) and not user.get("is_bot", False):
                real_users.append(user)

                display_name = user.get("profile", {}).get("display_name", "")
                real_name = user.get("profile", {}).get("real_name", "")
                email = user.get("profile", {}).get("email", "")
                user_id = user.get("id", "")

                print(f"Name: {real_name}")
                print(f"Display Name: {display_name}")
                print(f"Email: {email}")
                print(f"User ID: {user_id}")
                print("-" * 80)

        print(f"\n✅ Found {len(real_users)} real users (excluding bots)")

        # Show suggested updates for contacts.json
        print("\n" + "="*80)
        print("SUGGESTED CONTACT UPDATES:")
        print("="*80)

        contacts_to_update = ["Anna", "Diana"]
        for name in contacts_to_update:
            print(f"\n{name}:")
            # Search for matching user
            for user in real_users:
                real_name = user.get("profile", {}).get("real_name", "")
                display_name = user.get("profile", {}).get("display_name", "")
                email = user.get("profile", {}).get("email", "")

                if name.lower() in real_name.lower() or name.lower() in display_name.lower():
                    user_id = user.get("id", "")
                    print(f'  "slack_user_id": "{user_id}"  // {real_name} ({email})')

    except SlackApiError as e:
        print(f"❌ Error fetching users: {e.response['error']}")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")

if __name__ == "__main__":
    get_slack_users()
