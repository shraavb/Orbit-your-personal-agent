"""
FastAPI integration for MCP server.

This module mounts the FastMCP server to the main FastAPI application.
FastMCP handles all MCP protocol details (JSON-RPC, SSE, HTTP streaming).
"""

from fastapi import APIRouter
from starlette.applications import Starlette
import logging

logger = logging.getLogger(__name__)


def get_mcp_app() -> Starlette:
    """
    Get the FastMCP Starlette application.

    This function imports and returns the FastMCP app which can be mounted
    to the main FastAPI application.

    FastMCP provides two apps:
    - sse_app: Server-Sent Events transport (stateful)
    - streamable_http_app: HTTP streaming transport (stateless, better for cloud)

    Returns:
        Starlette application from FastMCP
    """
    from backend.mcp.server import get_mcp_server

    mcp_server = get_mcp_server()

    # Use streamable_http_app for stateless HTTP transport
    # This is better for cloud deployments and works with the MCP HTTP protocol
    # Note: streamable_http_app and sse_app are properties that return the app
    if hasattr(mcp_server, 'streamable_http_app'):
        logger.info("Using FastMCP streamable_http_app")
        # Check if it's a property or method
        app = mcp_server.streamable_http_app
        # If it's callable, call it (shouldn't be based on error, but let's handle both)
        if callable(app):
            return app()
        return app
    elif hasattr(mcp_server, 'sse_app'):
        logger.info("Using FastMCP sse_app")
        app = mcp_server.sse_app
        if callable(app):
            return app()
        return app
    else:
        logger.error("FastMCP server doesn't have streamable_http_app or sse_app")
        return None


logger.info("MCP router configured")
