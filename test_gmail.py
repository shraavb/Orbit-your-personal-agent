"""Quick test for Gmail integration."""

import sys
import os
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, 'backend')

from backend.integrations.gmail_service import get_gmail_service

def test_gmail():
    """Test sending an email via Gmail."""
    print("Testing Gmail service...")

    try:
        # Initialize Gmail service
        gmail_service = get_gmail_service()
        print("✅ Gmail service initialized successfully")

        # Send test email
        print("\nSending test email...")
        result = gmail_service.send_email(
            to="shraavastib@gmail.com",  # Sending to Shraav from contacts
            subject="🧪 Orbit Gmail Test",
            body="This is a test email from your Orbit voice agent!\n\nIf you're seeing this, Gmail integration is working perfectly."
        )

        if result["success"]:
            print(f"✅ Email sent successfully!")
            print(f"   Message ID: {result['message_id']}")
            print(f"\n📧 Check the inbox: shraavastib@gmail.com")
        else:
            print(f"❌ Failed to send email")
            print(f"   Error: {result['error']}")

        return result["success"]

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_gmail()
    sys.exit(0 if success else 1)
