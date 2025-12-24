# MCP Integration - Orbit Voice Agent

## Overview

Orbit now includes Model Context Protocol (MCP) integration, providing Claude Code with access to conversation memory and context. This enables more intelligent, context-aware interactions with your voice agent.

## Architecture

The MCP server runs as a **standalone service** on port 8001, separate from the main Orbit backend (port 8000).

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Claude Code    │────────►│  MCP Server      │────────►│  PostgreSQL DB  │
│  (MCP Client)   │         │  (Port 8001)     │         │  (Conversations)│
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     │
                            ┌────────▼─────────┐
                            │  Orbit Backend   │
                            │  (Port 8000)     │
                            └──────────────────┘
```

## Phase 1: Core Infrastructure (✅ Complete)

### Tools Available

1. **`retrieve_memories`** - Search past conversations for relevant context
   - Args: `query` (string), `limit` (int, default=5)
   - Returns: Recent conversations matching the query
   - Note: Currently returns recent conversations; semantic search with embeddings coming in Phase 2

2. **`store_memory`** - Store important information for future reference
   - Args: `content` (string), `importance` (float 0.0-1.0, default=0.5)
   - Returns: Storage confirmation
   - Note: Currently logs only; persistence with embeddings coming in Phase 2

3. **`get_recent_conversations`** - Get the most recent conversation history
   - Args: `limit` (int, default=10)
   - Returns: Recent conversations with timestamps

### Resources Available

1. **`orbit://conversation/history`** - Recent conversation history (last 10 conversations)
2. **`orbit://user/preferences`** - User preferences and settings (placeholder for Phase 2)

## Running the MCP Server

### Method 1: Standalone Script (Recommended)

```bash
# In the Orbit project directory
python run_mcp_server.py
```

The server will start on `http://localhost:8001` and display:
```
INFO - Starting Orbit MCP Server on http://localhost:8001
INFO - Tools: retrieve_memories, store_memory, get_recent_conversations
INFO - Resources: orbit://conversation/history, orbit://user/preferences
```

### Method 2: Background Process

```bash
# Start in background
nohup python run_mcp_server.py > mcp_server.log 2>&1 &

# Check status
ps aux | grep run_mcp_server.py

# View logs
tail -f mcp_server.log

# Stop
pkill -f run_mcp_server.py
```

## Connecting Claude Code

The project includes a `.mcp.json` configuration file:

```json
{
  "mcpServers": {
    "orbit-memory": {
      "type": "http",
      "url": "http://localhost:8001",
      "description": "Orbit voice agent memory and context server"
    }
  }
}
```

Claude Code automatically detects this file and connects to the MCP server when running in this directory.

### Manual Configuration (Optional)

If you need to configure manually:

```bash
# Add to Claude Code's MCP configuration
claude mcp add --transport http orbit-memory http://localhost:8001
```

## Testing the MCP Server

### 1. Health Check

The server responds with JSON-RPC errors to basic HTTP requests (this is expected):

```bash
curl http://localhost:8001/
# Response: {"jsonrpc":"2.0","id":"server-error","error":{"code":-32600,"message":"Not Acceptable: Client must accept text/event-stream"}}
```

This confirms the server is running and responding.

### 2. Using with Claude Code

Once connected, you can use MCP tools naturally in conversation:

```
User: "What did I talk to Mummy about recently?"
Claude → Calls retrieve_memories("Mummy")
Claude: "You recently asked me to send an email to Mummy about being late for dinner."
```

## Current Limitations (Phase 1)

- **No Semantic Search**: `retrieve_memories` returns recent conversations, not semantically relevant ones
- **No Persistence**: `store_memory` logs but doesn't persist to database
- **Placeholder Preferences**: User preferences are hardcoded placeholders

These will be addressed in Phase 2 with pgvector and embeddings.

## Phase 2: Semantic Memory (Planned)

- PostgreSQL with pgvector extension
- Conversation embeddings for semantic search
- Persistent memory storage
- Learned user preferences

## Phase 3: Enhanced Context (Planned)

- Contact management via MCP
- Calendar/Events integration
- Document/Notes access

## Troubleshooting

### Server Won't Start

**Error**: `Address already in use`
```bash
# Check what's using port 8001
lsof -i :8001

# Kill the process
kill -9 <PID>
```

**Error**: `ModuleNotFoundError`
```bash
# Ensure you're in the project directory and venv is activated
source backend/venv/bin/activate
PYTHONPATH=. python run_mcp_server.py
```

### Claude Code Can't Connect

1. Verify MCP server is running:
   ```bash
   ps aux | grep run_mcp_server.py
   ```

2. Check the URL in `.mcp.json` is correct: `http://localhost:8001`

3. Restart Claude Code after updating configuration

### Database Connection Errors

The MCP server uses the same database as the main Orbit backend. Ensure:
- PostgreSQL is running
- Database exists and is initialized
- Environment variables are set (DATABASE_URL in .env)

## Files Reference

- **`backend/mcp/server.py`** - FastMCP server with tools and resources
- **`backend/mcp/router.py`** - Integration helpers (currently unused in standalone mode)
- **`run_mcp_server.py`** - Standalone server launcher script
- **`.mcp.json`** - Claude Code MCP configuration
- **`MCP_INTEGRATION_PLAN.md`** - Full implementation plan

## Next Steps

To continue MCP integration:

1. **Phase 2**: Add pgvector extension and implement semantic memory (see MCP_INTEGRATION_PLAN.md lines 413-566)
2. **Phase 3**: Migrate contacts to MCP server (see MCP_INTEGRATION_PLAN.md lines 567-640)
3. **Phase 4**: Integrate MCP tools into LangChain agent (see MCP_INTEGRATION_PLAN.md lines 642-674)

## Production Deployment

For cloud deployment (Railway/Render/Vercel):

1. Deploy MCP server as a separate service
2. Update `.mcp.json` with production URL
3. Ensure CORS is configured correctly
4. Use environment variables for database connection
5. Add pgvector extension before Phase 2

See `DEPLOYMENT.md` for detailed deployment instructions.
