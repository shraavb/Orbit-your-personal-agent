"""Test the email request to reproduce the error."""
import requests
import json
import base64

# Simulate a voice request (we'll skip the audio and just test with text directly)
# Let's test the agent endpoint with the email command

API_URL = "http://localhost:8000/api"

# First, let's just test with a mock voice request
# In reality, frontend sends audio, but for debugging let's create a minimal test

print("Testing email request to backend...")

# Create a minimal audio blob (silence) just to test
minimal_audio = base64.b64encode(b'\x00' * 100).decode('utf-8')

request_payload = {
    "audio_data": minimal_audio,
    "audio_format": "webm"
}

print(f"\nSending POST to {API_URL}/voice")
print(f"Payload: {json.dumps(request_payload, indent=2)[:200]}...")

try:
    response = requests.post(
        f"{API_URL}/voice",
        json=request_payload,
        headers={"Content-Type": "application/json"}
    )

    print(f"\nResponse Status: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")

    if response.status_code == 200:
        print(f"\n✅ Success! Response:")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"\n❌ Error Response:")
        print(response.text)

except Exception as e:
    print(f"\n❌ Exception: {str(e)}")
