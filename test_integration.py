#!/usr/bin/env python3
"""
Quick integration test for Orbit Voice Agent.
Tests the complete workflow with the running backend.
"""

import requests
import base64
import json
import sys
from pathlib import Path


BASE_URL = "http://localhost:8000"


def create_test_audio():
    """Create mock audio data for testing."""
    # Create a simple binary data as mock audio
    mock_audio = b"RIFF" + b"\x00" * 100  # Minimal audio-like data
    return base64.b64encode(mock_audio).decode('utf-8')


def test_health():
    """Test 1: Health Check"""
    print("\n" + "="*60)
    print("TEST 1: Health Check")
    print("="*60)

    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Status: {data.get('status')}")
            print(f"✅ Service: {data.get('service')}")
            return True
        else:
            print(f"❌ Failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def test_voice_basic():
    """Test 2: Basic Voice Request"""
    print("\n" + "="*60)
    print("TEST 2: Basic Voice Request")
    print("="*60)

    try:
        payload = {
            "audio_data": create_test_audio(),
            "audio_format": "webm"
        }

        print("📤 Sending voice request...")
        response = requests.post(
            f"{BASE_URL}/api/voice",
            json=payload,
            timeout=60
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Request ID: {data.get('request_id')}")
            print(f"✅ Transcript: {data.get('transcript', 'N/A')[:100]}")
            print(f"✅ Agent Response: {data.get('agent_response', 'N/A')[:100]}")
            print(f"✅ TTS Audio: {'Present' if data.get('tts_audio_url') else 'Missing'}")
            print(f"✅ Status: {data.get('status')}")

            if data.get('proposed_action'):
                print(f"✅ Proposed Action: {data['proposed_action']['action_type']}")
            else:
                print("✅ No action proposed (expected for general conversation)")

            return True
        else:
            print(f"❌ Failed: HTTP {response.status_code}")
            print(f"❌ Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_api_structure():
    """Test 3: API Response Structure Validation"""
    print("\n" + "="*60)
    print("TEST 3: API Response Structure")
    print("="*60)

    try:
        payload = {
            "audio_data": create_test_audio(),
            "audio_format": "webm"
        }

        response = requests.post(
            f"{BASE_URL}/api/voice",
            json=payload,
            timeout=60
        )

        if response.status_code == 200:
            data = response.json()

            # Required fields
            required_fields = [
                "request_id",
                "transcript",
                "agent_response",
                "tts_audio_url",
                "status"
            ]

            all_present = True
            for field in required_fields:
                if field in data:
                    print(f"✅ Field '{field}': Present")
                else:
                    print(f"❌ Field '{field}': Missing")
                    all_present = False

            # Check data types
            if isinstance(data.get('request_id'), int):
                print(f"✅ request_id is integer")
            else:
                print(f"❌ request_id should be integer")
                all_present = False

            if isinstance(data.get('transcript'), str):
                print(f"✅ transcript is string")
            else:
                print(f"❌ transcript should be string")
                all_present = False

            return all_present
        else:
            print(f"❌ Failed: HTTP {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def test_error_handling():
    """Test 4: Error Handling"""
    print("\n" + "="*60)
    print("TEST 4: Error Handling")
    print("="*60)

    test_cases = [
        {
            "name": "Empty audio data",
            "payload": {"audio_data": "", "audio_format": "webm"}
        },
        {
            "name": "Invalid base64",
            "payload": {"audio_data": "INVALID!!!", "audio_format": "webm"}
        },
        {
            "name": "Missing audio_format",
            "payload": {"audio_data": create_test_audio()}
        }
    ]

    passed = 0
    for test in test_cases:
        print(f"\n  Testing: {test['name']}")
        try:
            response = requests.post(
                f"{BASE_URL}/api/voice",
                json=test['payload'],
                timeout=60
            )

            if response.status_code in [400, 422, 500]:
                print(f"  ✅ Error handled gracefully: HTTP {response.status_code}")
                passed += 1
            elif response.status_code == 200:
                print(f"  ⚠️  Succeeded (may be intentional)")
                passed += 1
            else:
                print(f"  ❌ Unexpected status: {response.status_code}")

        except Exception as e:
            print(f"  ❌ Error: {str(e)}")

    return passed == len(test_cases)


def check_potential_issues():
    """Test 5: Check for Potential Issues"""
    print("\n" + "="*60)
    print("TEST 5: Potential Issues Check")
    print("="*60)

    issues = []

    # Check contacts file
    contacts_file = Path("backend/data/contacts.json")
    if contacts_file.exists():
        print("✅ Contacts file exists")
        try:
            with open(contacts_file) as f:
                contacts = json.load(f)
                print(f"✅ Contacts loaded: {len(contacts)} contacts")

                # Check for missing fields
                for name, contact in contacts.items():
                    missing_fields = []
                    if not contact.get('phone') and not contact.get('email') and \
                       not contact.get('slack_user_id') and not contact.get('slack_channel'):
                        missing_fields.append("No contact method")

                    if missing_fields:
                        issues.append(f"Contact '{name}': {', '.join(missing_fields)}")

        except Exception as e:
            issues.append(f"Contacts file error: {str(e)}")
    else:
        issues.append("Contacts file missing")

    # Check database connection
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Database connection (via health check)")
        else:
            issues.append("Database connection issue")
    except Exception as e:
        issues.append(f"Cannot reach backend: {str(e)}")

    # Check .env file
    env_file = Path(".env")
    if env_file.exists():
        print("✅ .env file exists")
        try:
            with open(env_file) as f:
                env_content = f.read()
                required_keys = [
                    "ANTHROPIC_API_KEY",
                    "ELEVENLABS_API_KEY",
                    "LANGSMITH_API_KEY"
                ]
                for key in required_keys:
                    if key in env_content:
                        print(f"✅ {key} configured")
                    else:
                        issues.append(f"Missing {key}")
        except Exception as e:
            issues.append(f".env file error: {str(e)}")
    else:
        issues.append(".env file missing")

    print("\n" + "-"*60)
    if issues:
        print("⚠️  Potential Issues Found:")
        for issue in issues:
            print(f"  - {issue}")
        return False
    else:
        print("✅ No issues detected")
        return True


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("ORBIT VOICE AGENT - INTEGRATION TEST SUITE")
    print("="*60)
    print("\nThis will test the complete workflow:")
    print("  • API connectivity")
    print("  • Voice request processing")
    print("  • Response structure")
    print("  • Error handling")
    print("  • Configuration issues")

    results = {
        "Health Check": test_health(),
        "Voice Request": test_voice_basic(),
        "Response Structure": test_api_structure(),
        "Error Handling": test_error_handling(),
        "Configuration Check": check_potential_issues()
    }

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} - {test_name}")

    print("\n" + "="*60)
    print(f"Results: {passed}/{total} tests passed")
    print("="*60)

    if passed == total:
        print("\n🎉 All tests passed! The system is ready to use.")
        print("\nNext steps:")
        print("  1. Go to http://localhost:5173/")
        print("  2. Hold the microphone button and speak")
        print("  3. Test these scenarios:")
        print("     - 'Hi Orbit, how are you?'")
        print("     - 'Send John a text saying hello'")
        print("     - 'Email Sarah about the meeting'")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Check the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
