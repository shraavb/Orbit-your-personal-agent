"""
MCP Server implementation for Orbit Voice Agent using FastMCP.

This module provides Model Context Protocol (MCP) server that exposes:
- Tools: Functions Claude can call (retrieve_memories, store_memory)
- Resources: Static/dynamic data (conversation history, user preferences)
- Prompts: Workflows that become slash commands
"""

from typing import Any, Dict, List
import logging
import json
from datetime import datetime

from mcp.server import FastMCP
from mcp.types import TextContent, ImageContent, EmbeddedResource

logger = logging.getLogger(__name__)

# Create FastMCP server instance
mcp = FastMCP(
    name="orbit-memory",
    instructions="Orbit voice agent memory and context server. Provides tools for storing and retrieving conversation memories, accessing conversation history, and managing user preferences.",
    debug=True,  # Enable debug for now
    stateless_http=True,  # Use stateless HTTP for better cloud deployment
    host="127.0.0.1",  # Bind to localhost
    port=8001,  # MCP server port
    mount_path="/",  # Mount at root
    streamable_http_path="/"  # Streamable HTTP at root
)


@mcp.tool()
async def retrieve_memories(query: str, limit: int = 5) -> str:
    """
    Search past conversations for relevant context.

    Use this to find previous discussions, user preferences, or important
    information mentioned in past interactions.

    Args:
        query: Search query for relevant memories (e.g., 'discussions about project timeline')
        limit: Maximum number of memories to retrieve (1-20)

    Returns:
        JSON string with memories and metadata
    """
    try:
        from backend.models.database import Request
        from backend.models.db import get_db

        # Validate limit
        limit = max(1, min(20, limit))

        # Get recent requests (TODO: Add semantic search with embeddings in Phase 2)
        with get_db() as db:
            requests = (
                db.query(Request)
                .filter(Request.transcript.isnot(None))
                .filter(Request.agent_response.isnot(None))
                .order_by(Request.created_at.desc())
                .limit(limit)
                .all()
            )

            memories = [
                {
                    "transcript": req.transcript,
                    "response": req.agent_response,
                    "timestamp": req.created_at.isoformat() if req.created_at else None
                }
                for req in requests
            ]

        logger.info(f"Retrieved {len(memories)} memories for query: {query}")

        result = {
            "memories": memories,
            "count": len(memories),
            "query": query,
            "note": "Currently returning recent conversations. Semantic search will be added in Phase 2."
        }

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        logger.error(f"Error retrieving memories: {str(e)}", exc_info=True)
        return json.dumps({
            "memories": [],
            "count": 0,
            "error": str(e)
        })


@mcp.tool()
async def store_memory(content: str, importance: float = 0.5) -> str:
    """
    Store important information for future reference.

    Use this to remember user preferences, important facts, or context
    that should be recalled later.

    Args:
        content: Content to remember (e.g., 'User prefers Slack for work communications')
        importance: Importance score between 0.0 and 1.0 (0.5 = normal, 0.8+ = very important)

    Returns:
        JSON string with storage status
    """
    try:
        # Validate importance
        importance = max(0.0, min(1.0, importance))

        # TODO: In Phase 2, store with embeddings in conversation_memories table
        logger.info(f"[MEMORY] Storing (importance: {importance}): {content}")

        result = {
            "status": "stored",
            "content": content,
            "importance": importance,
            "timestamp": datetime.now().isoformat(),
            "note": "Currently logging only. Will persist with embeddings in Phase 2."
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        logger.error(f"Error storing memory: {str(e)}", exc_info=True)
        return json.dumps({
            "status": "error",
            "error": str(e)
        })


@mcp.tool()
async def get_recent_conversations(limit: int = 10) -> str:
    """
    Get the most recent conversation history.

    Useful for maintaining context across sessions.

    Args:
        limit: Number of recent conversations to retrieve (1-50)

    Returns:
        JSON string with recent conversations
    """
    try:
        from backend.models.database import Request
        from backend.models.db import get_db

        # Validate limit
        limit = max(1, min(50, limit))

        with get_db() as db:
            requests = (
                db.query(Request)
                .filter(Request.transcript.isnot(None))
                .order_by(Request.created_at.desc())
                .limit(limit)
                .all()
            )

            conversations = [
                {
                    "id": req.id,
                    "transcript": req.transcript,
                    "response": req.agent_response,
                    "timestamp": req.created_at.isoformat() if req.created_at else None,
                    "status": req.status
                }
                for req in requests
            ]

        result = {
            "conversations": conversations,
            "count": len(conversations)
        }

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        logger.error(f"Error getting recent conversations: {str(e)}", exc_info=True)
        return json.dumps({
            "conversations": [],
            "count": 0,
            "error": str(e)
        })


@mcp.resource("orbit://conversation/history")
async def get_conversation_history() -> str:
    """
    Resource: Recent conversation history.

    Returns the last 10 conversations with timestamps and context.
    """
    try:
        # Reuse the tool function
        result_json = await get_recent_conversations(limit=10)
        return result_json

    except Exception as e:
        logger.error(f"Error getting conversation history: {str(e)}", exc_info=True)
        return json.dumps({"error": str(e)})


@mcp.resource("orbit://user/preferences")
async def get_user_preferences() -> str:
    """
    Resource: User preferences and settings.

    Returns user communication preferences, timezone, and other settings.
    """
    try:
        # TODO: Load from database in Phase 2
        preferences = {
            "default_channel": "slack",
            "timezone": "America/Los_Angeles",
            "note": "Placeholder preferences. Will load from database in Phase 2."
        }
        return json.dumps(preferences, indent=2)

    except Exception as e:
        logger.error(f"Error getting user preferences: {str(e)}", exc_info=True)
        return json.dumps({"error": str(e)})


# Helper function to get the FastMCP instance
def get_mcp_server() -> FastMCP:
    """Get the FastMCP server instance."""
    return mcp


logger.info("FastMCP server configured with tools and resources")
