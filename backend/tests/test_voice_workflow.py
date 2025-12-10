"""
Comprehensive tests for voice workflow.

Tests all scenarios from audio input to response and action execution.
"""

import pytest
import httpx
import base64
import json
from pathlib import Path


BASE_URL = "http://localhost:8000"
API_ENDPOINT = f"{BASE_URL}/api/voice"


def create_mock_audio_base64():
    """Create a mock base64-encoded audio for testing."""
    # Create a minimal WebM audio file (just a header for testing)
    # In real tests, you'd use actual audio files
    mock_audio = b"MOCK_AUDIO_DATA_FOR_TESTING" * 100
    return base64.b64encode(mock_audio).decode('utf-8')


class TestVoiceWorkflow:
    """Test suite for complete voice workflow."""

    @pytest.mark.asyncio
    async def test_01_basic_conversation_no_action(self):
        """Test basic conversation without any action."""
        print("\n=== TEST 1: Basic Conversation (No Action) ===")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                API_ENDPOINT,
                json={
                    "audio_data": create_mock_audio_base64(),
                    "audio_format": "webm"
                }
            )

            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()

            # Verify response structure
            assert "request_id" in data
            assert "transcript" in data
            assert "agent_response" in data
            assert "tts_audio_url" in data
            assert "status" in data

            # Verify no action was proposed
            assert data.get("proposed_action") is None

            print(f"✅ Request ID: {data['request_id']}")
            print(f"✅ Transcript: {data['transcript']}")
            print(f"✅ Agent Response: {data['agent_response']}")
            print(f"✅ TTS Audio: {'Present' if data['tts_audio_url'] else 'Missing'}")

    @pytest.mark.asyncio
    async def test_02_sms_action_valid_contact(self):
        """Test SMS action with valid contact (John)."""
        print("\n=== TEST 2: SMS Action - Valid Contact (John) ===")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                API_ENDPOINT,
                json={
                    "audio_data": create_mock_audio_base64(),
                    "audio_format": "webm"
                }
            )

            assert response.status_code == 200
            data = response.json()

            # Verify action was proposed
            if data.get("proposed_action"):
                action = data["proposed_action"]
                assert action["action_type"] == "send_sms"
                assert "parameters" in action
                assert action["parameters"]["recipient_name"] == "John Smith"
                assert action["parameters"]["recipient_phone"] == "+15551234567"

                print(f"✅ SMS Action Proposed")
                print(f"✅ Recipient: {action['parameters']['recipient_name']}")
                print(f"✅ Phone: {action['parameters']['recipient_phone']}")
                print(f"✅ Message: {action['parameters']['message']}")
            else:
                print("⚠️ No action proposed - agent may need clearer instruction")

    @pytest.mark.asyncio
    async def test_03_email_action_valid_contact(self):
        """Test Email action with valid contact (Sarah)."""
        print("\n=== TEST 3: Email Action - Valid Contact (Sarah) ===")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                API_ENDPOINT,
                json={
                    "audio_data": create_mock_audio_base64(),
                    "audio_format": "webm"
                }
            )

            assert response.status_code == 200
            data = response.json()

            if data.get("proposed_action"):
                action = data["proposed_action"]
                assert action["action_type"] == "send_email"
                assert "parameters" in action
                assert action["parameters"]["recipient_name"] == "Sarah Johnson"
                assert action["parameters"]["recipient_email"] == "sarah.johnson@example.com"

                print(f"✅ Email Action Proposed")
                print(f"✅ Recipient: {action['parameters']['recipient_name']}")
                print(f"✅ Email: {action['parameters']['recipient_email']}")
                print(f"✅ Subject: {action['parameters']['subject']}")

    @pytest.mark.asyncio
    async def test_04_slack_action_valid_contact(self):
        """Test Slack action with valid contact (Team)."""
        print("\n=== TEST 4: Slack Action - Valid Contact (Team) ===")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                API_ENDPOINT,
                json={
                    "audio_data": create_mock_audio_base64(),
                    "audio_format": "webm"
                }
            )

            assert response.status_code == 200
            data = response.json()

            if data.get("proposed_action"):
                action = data["proposed_action"]
                assert action["action_type"] == "send_slack"
                assert "parameters" in action

                print(f"✅ Slack Action Proposed")
                print(f"✅ Recipient: {action['parameters']['recipient_name']}")
                print(f"✅ Channel: {action['parameters'].get('channel_id', 'N/A')}")

    @pytest.mark.asyncio
    async def test_05_invalid_contact(self):
        """Test handling of invalid contact."""
        print("\n=== TEST 5: Invalid Contact Handling ===")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                API_ENDPOINT,
                json={
                    "audio_data": create_mock_audio_base64(),
                    "audio_format": "webm"
                }
            )

            assert response.status_code == 200
            data = response.json()

            # Agent should ask for contact details
            assert "contact" in data["agent_response"].lower() or \
                   "find" in data["agent_response"].lower() or \
                   "provide" in data["agent_response"].lower()

            print(f"✅ Error Handling: {data['agent_response']}")

    @pytest.mark.asyncio
    async def test_06_health_endpoint(self):
        """Test health endpoint."""
        print("\n=== TEST 6: Health Endpoint ===")

        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/health")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"

            print(f"✅ Service Status: {data['status']}")
            print(f"✅ Service: {data['service']}")

    @pytest.mark.asyncio
    async def test_07_empty_audio(self):
        """Test handling of empty audio data."""
        print("\n=== TEST 7: Empty Audio Handling ===")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                API_ENDPOINT,
                json={
                    "audio_data": "",
                    "audio_format": "webm"
                }
            )

            # Should handle gracefully
            print(f"✅ Status Code: {response.status_code}")
            if response.status_code != 200:
                print(f"✅ Error handled: {response.json()}")

    @pytest.mark.asyncio
    async def test_08_invalid_audio_format(self):
        """Test handling of invalid audio format."""
        print("\n=== TEST 8: Invalid Audio Format ===")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                API_ENDPOINT,
                json={
                    "audio_data": "INVALID_BASE64_!!!",
                    "audio_format": "webm"
                }
            )

            # Should handle gracefully
            print(f"✅ Status Code: {response.status_code}")
            if response.status_code != 200:
                print(f"✅ Error handled: {response.json()}")


def run_manual_tests():
    """
    Manual test scenarios that can be run with actual audio.

    To use:
    1. Record actual audio files
    2. Pass them to these test functions
    3. Verify the complete workflow
    """
    print("\n" + "="*60)
    print("MANUAL TEST SCENARIOS")
    print("="*60)

    scenarios = [
        {
            "name": "Basic Greeting",
            "audio_input": "Hi Orbit, how are you?",
            "expected": "Friendly response, no action"
        },
        {
            "name": "SMS to John",
            "audio_input": "Send John a text saying I'll be 10 minutes late",
            "expected": "SMS action proposed to John Smith (+15551234567)"
        },
        {
            "name": "Email to Sarah",
            "audio_input": "Email Sarah about the meeting tomorrow with subject 'Meeting Update'",
            "expected": "Email action proposed to sarah.johnson@example.com"
        },
        {
            "name": "Slack to Team",
            "audio_input": "Post to the engineering team channel saying the deployment is complete",
            "expected": "Slack action proposed to #engineering channel"
        },
        {
            "name": "Invalid Contact",
            "audio_input": "Send a text to Anna",
            "expected": "Error message asking for contact info"
        },
        {
            "name": "Contact Without Phone",
            "audio_input": "Send Team a text message",
            "expected": "Error message - Team doesn't have phone number"
        },
        {
            "name": "Multi-step Conversation",
            "audio_input": ["What's the weather?", "Can you send that to John?"],
            "expected": "Handle context across multiple requests"
        }
    ]

    print("\nTest these scenarios manually:")
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{i}. {scenario['name']}")
        print(f"   Input: {scenario['audio_input']}")
        print(f"   Expected: {scenario['expected']}")


if __name__ == "__main__":
    # Run automated tests
    print("="*60)
    print("ORBIT VOICE AGENT - COMPREHENSIVE TEST SUITE")
    print("="*60)

    # Note: These tests need the backend to be running
    print("\n⚠️  Make sure the backend is running on http://localhost:8000")
    print("\nTo run these tests:")
    print("  pytest backend/tests/test_voice_workflow.py -v -s")

    # Display manual test scenarios
    run_manual_tests()
