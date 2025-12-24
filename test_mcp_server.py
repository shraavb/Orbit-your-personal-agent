"""Test the MCP server endpoints."""
import requests
import json

API_URL = "http://localhost:8000/api/mcp"

def test_list_tools():
    """Test listing available tools."""
    print("\n=== Testing list_tools ===")
    payload = {
        "jsonrpc": "2.0",
        "method": "tools/list",
        "id": 1
    }

    response = requests.post(API_URL, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    return response.json()

def test_list_resources():
    """Test listing available resources."""
    print("\n=== Testing list_resources ===")
    payload = {
        "jsonrpc": "2.0",
        "method": "resources/list",
        "id": 2
    }

    response = requests.post(API_URL, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    return response.json()

def test_retrieve_memories():
    """Test retrieving memories."""
    print("\n=== Testing retrieve_memories tool ===")
    payload = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "retrieve_memories",
            "arguments": {
                "query": "email to mummy",
                "limit": 3
            }
        },
        "id": 3
    }

    response = requests.post(API_URL, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    return response.json()

def test_store_memory():
    """Test storing a memory."""
    print("\n=== Testing store_memory tool ===")
    payload = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "store_memory",
            "arguments": {
                "content": "User prefers to send emails to family members in the evening",
                "importance": 0.7
            }
        },
        "id": 4
    }

    response = requests.post(API_URL, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    return response.json()

def test_get_recent_conversations():
    """Test getting recent conversations."""
    print("\n=== Testing get_recent_conversations tool ===")
    payload = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "get_recent_conversations",
            "arguments": {
                "limit": 5
            }
        },
        "id": 5
    }

    response = requests.post(API_URL, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    return response.json()

def test_read_resource():
    """Test reading a resource."""
    print("\n=== Testing read_resource ===")
    payload = {
        "jsonrpc": "2.0",
        "method": "resources/read",
        "params": {
            "uri": "orbit://conversation/history"
        },
        "id": 6
    }

    response = requests.post(API_URL, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    return response.json()

if __name__ == "__main__":
    print("Testing MCP Server at", API_URL)
    print("=" * 60)

    try:
        # Test tool listing
        test_list_tools()

        # Test resource listing
        test_list_resources()

        # Test retrieving memories
        test_retrieve_memories()

        # Test storing a memory
        test_store_memory()

        # Test getting recent conversations
        test_get_recent_conversations()

        # Test reading a resource
        test_read_resource()

        print("\n" + "=" * 60)
        print("✅ All MCP server tests completed!")

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
