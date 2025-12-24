#!/usr/bin/env python3
"""
Standalone MCP server for Orbit.

This script runs the FastMCP server on port 8001, providing tools and resources
for Claude Code to access Orbit's conversation memory and context.

Usage:
    python run_mcp_server.py
"""

import asyncio
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def main():
    """Run the FastMCP server."""
    from backend.mcp.server import get_mcp_server

    mcp_server = get_mcp_server()

    logger.info("Starting Orbit MCP Server on http://localhost:8001")
    logger.info("Tools: retrieve_memories, store_memory, get_recent_conversations")
    logger.info("Resources: orbit://conversation/history, orbit://user/preferences")

    # Run the FastMCP server using streamable HTTP
    # Host and port are configured in the FastMCP instance
    await mcp_server.run_streamable_http_async()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("MCP server stopped by user")
    except Exception as e:
        logger.error(f"MCP server error: {e}", exc_info=True)
        raise
