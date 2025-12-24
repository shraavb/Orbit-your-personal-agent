# MCP Integration Plan for Orbit Voice Agent

## Overview
Integrate Model Context Protocol (MCP) to enhance conversation flow and context management in the Orbit voice agent.

## Understanding MCP Architecture (CRITICAL)

### What MCP Actually Is:
MCP is an **open protocol** (like USB-C for AI) that allows Claude to connect to external data sources and tools. It's a **client-server model** where:

- **Claude Code/Desktop acts as the MCP Host/Client**
- **Your application provides MCP Servers** (via HTTP or Stdio)
- **Communication uses JSON-RPC 2.0 protocol**

### Key Architecture Insight:
```
Claude Code (MCP Client)
    ↓ JSON-RPC 2.0
MCP Server (your FastAPI app or external service)
    ↓
Your Data/Tools (database, APIs, files)
```

**Important**: Your FastAPI app does NOT run an MCP client. Instead, Claude connects TO your MCP server directly.

## Architecture Changes

### Current Flow:
```
Voice Input → ASR → [Last 10 DB Records] → LangChain Agent → TTS → Response
```

### Enhanced Flow with MCP:
```
                    ┌─────────────────────────────────────┐
                    │   Claude Code (MCP Host/Client)    │
                    └─────────────┬───────────────────────┘
                                  │
                    ┌─────────────▼───────────────────────┐
                    │      Your FastAPI Application       │
                    │                                     │
                    │  ┌───────────────────────────────┐ │
Voice Input ───────►│  │   ASR Service (Whisper)      │ │
                    │  └──────────┬────────────────────┘ │
                    │             │                       │
                    │  ┌──────────▼────────────────────┐ │
                    │  │  MCP Servers (expose context) │ │
                    │  │  • Memory Server (embeddings) │ │
                    │  │  • Contacts Server            │ │
                    │  │  • Calendar Server            │ │
                    │  └──────────┬────────────────────┘ │
                    │             │                       │
                    │  ┌──────────▼────────────────────┐ │
                    │  │   LangChain Agent             │ │
                    │  │   (calls MCP tools)           │ │
                    │  └──────────┬────────────────────┘ │
                    │             │                       │
                    │  ┌──────────▼────────────────────┐ │
                    │  │   TTS Service (ElevenLabs)    │ │
                    │  └──────────┬────────────────────┘ │
                    └─────────────┼───────────────────────┘
                                  │
Response ◄────────────────────────┘
```

### How Claude Accesses Your MCP Servers:

**Option 1: HTTP Transport** (Recommended for Cloud/Remote)
```bash
# Add your deployed MCP server to Claude
claude mcp add --transport http orbit-memory https://your-app.com/mcp/memory
```

**Option 2: Stdio Transport** (For Local Development)
```bash
# Claude runs your MCP server as a subprocess
claude mcp add --transport stdio orbit-memory -- python mcp_server.py
```

### 2. MCP Servers to Implement

#### A. Memory Server (Priority: HIGH)
**Purpose**: Semantic long-term memory for conversations

**Capabilities**:
- Store conversation summaries with embeddings
- Retrieve relevant past context based on current query
- Remember user preferences, patterns, and important facts
- Support semantic search across all historical interactions

**Implementation**:
- Use `@modelcontextprotocol/server-memory` or custom implementation
- Store embeddings in PostgreSQL with pgvector extension
- Tools exposed to agent:
  - `store_memory(content, metadata)`: Save important information
  - `retrieve_memories(query, limit)`: Semantic search for relevant context
  - `list_recent_memories(limit)`: Get recent interactions

**Integration Point**: `/backend/services/agent.py:70-75`
```python
# Before agent invocation
mcp_context = await memory_server.retrieve_memories(
    query=transcript,
    limit=5
)
# Add to chat_history or system prompt
```

#### B. Contacts Server (Priority: HIGH)
**Purpose**: Rich contact management with context

**Capabilities**:
- Store contacts with multiple attributes (name, phone, email, slack, whatsapp, preferences)
- Fuzzy name matching
- Relationship context (manager, family, colleague)
- Communication preferences per contact

**Implementation**:
- Migrate from JSON to MCP contact server
- Tools exposed:
  - `search_contacts(query)`: Fuzzy search by name/alias
  - `get_contact(id)`: Full contact details
  - `update_contact_preference(id, channel, preference)`: Learn preferences

**Integration Point**: Replace `/backend/services/contacts.py`
```python
# Instead of ContactService.find_contact_by_name()
contact = await contacts_mcp.search_contacts(name)
```

#### C. Calendar/Events Server (Priority: MEDIUM)
**Purpose**: Context-aware scheduling and availability

**Capabilities**:
- Access user's calendar (Google Calendar, Outlook)
- Check availability for context
- Retrieve upcoming events
- Set reminders

**Tools**:
- `get_upcoming_events(days)`: Next N days of events
- `check_availability(date, duration)`: Free time slots
- `create_event(title, start, end, attendees)`: Schedule meetings

**Use Case**: "Send a Slack message to John about tomorrow's meeting"
- Agent can retrieve tomorrow's events from calendar MCP
- Include meeting details in message context

#### D. Document/Notes Server (Priority: LOW)
**Purpose**: Access to user's personal knowledge base

**Capabilities**:
- Search across notes, documents, wikis
- Retrieve specific document content
- Store user preferences and instructions

**Tools**:
- `search_documents(query)`: Semantic document search
- `get_document(id)`: Retrieve full content
- `store_note(content, tags)`: Save information

**Use Case**: "Email the proposal to Sarah"
- Agent can find the proposal document via MCP
- Reference or attach it in the email

## Implementation Steps

### Phase 1: Core MCP Infrastructure (Week 1)

1. **Add MCP SDK Dependencies**
   ```bash
   pip install mcp
   ```

2. **Choose Your MCP Integration Approach**

   **Option A: HTTP Transport** (Recommended - works with deployed apps)
   - Add MCP endpoints to your existing FastAPI app
   - Claude connects via HTTP to your deployed server
   - Best for cloud deployment (Railway, Render, etc.)

   **Option B: Stdio Transport** (Good for local development)
   - Run separate MCP server process
   - Claude spawns your server as subprocess
   - Best for local testing

3. **Implement HTTP MCP Server in FastAPI** (Recommended)

   File: `/backend/mcp/server.py`
   ```python
   from fastapi import APIRouter, Request
   from mcp.server import Server
   from mcp.types import Tool, Resource
   from typing import Any, Dict, List
   import logging

   logger = logging.getLogger(__name__)

   class OrbitMCPServer:
       """
       MCP Server that exposes Orbit's memory and context to Claude
       """
       def __init__(self, db):
           self.server = Server("orbit-memory")
           self.db = db
           self._register_handlers()

       def _register_handlers(self):
           """Register MCP protocol handlers"""

           @self.server.list_tools()
           async def list_tools() -> List[Tool]:
               """List available tools"""
               return [
                   Tool(
                       name="retrieve_memories",
                       description="Search past conversations for relevant context",
                       inputSchema={
                           "type": "object",
                           "properties": {
                               "query": {
                                   "type": "string",
                                   "description": "Search query for relevant memories"
                               },
                               "limit": {
                                   "type": "integer",
                                   "description": "Number of memories to retrieve",
                                   "default": 5
                               }
                           },
                           "required": ["query"]
                       }
                   ),
                   Tool(
                       name="store_memory",
                       description="Store important information for future reference",
                       inputSchema={
                           "type": "object",
                           "properties": {
                               "content": {
                                   "type": "string",
                                   "description": "Content to remember"
                               },
                               "importance": {
                                   "type": "number",
                                   "description": "Importance score (0-1)",
                                   "default": 0.5
                               }
                           },
                           "required": ["content"]
                       }
                   )
               ]

           @self.server.call_tool()
           async def call_tool(name: str, arguments: Dict[str, Any]) -> Any:
               """Execute a tool"""
               if name == "retrieve_memories":
                   return await self.retrieve_memories(
                       arguments.get("query"),
                       arguments.get("limit", 5)
                   )
               elif name == "store_memory":
                   return await self.store_memory(
                       arguments.get("content"),
                       arguments.get("importance", 0.5)
                   )
               else:
                   raise ValueError(f"Unknown tool: {name}")

           @self.server.list_resources()
           async def list_resources() -> List[Resource]:
               """List available resources"""
               return [
                   Resource(
                       uri="orbit://conversation/history",
                       name="Conversation History",
                       description="Recent conversation history",
                       mimeType="application/json"
                   ),
                   Resource(
                       uri="orbit://user/preferences",
                       name="User Preferences",
                       description="User communication preferences",
                       mimeType="application/json"
                   )
               ]

           @self.server.read_resource()
           async def read_resource(uri: str) -> str:
               """Read a resource"""
               if uri == "orbit://conversation/history":
                   return await self.get_conversation_history()
               elif uri == "orbit://user/preferences":
                   return await self.get_user_preferences()
               else:
                   raise ValueError(f"Unknown resource: {uri}")

       async def retrieve_memories(self, query: str, limit: int = 5) -> Dict[str, Any]:
           """Retrieve relevant memories using semantic search"""
           # TODO: Implement with embeddings
           # For now, return recent requests
           from backend.models.database import Request
           requests = await self.db.execute(
               "SELECT transcript, agent_response FROM requests "
               "ORDER BY created_at DESC LIMIT :limit",
               {"limit": limit}
           )
           memories = [dict(r) for r in requests]
           return {
               "memories": memories,
               "count": len(memories)
           }

       async def store_memory(self, content: str, importance: float = 0.5) -> Dict[str, Any]:
           """Store a memory"""
           # TODO: Implement with embeddings
           logger.info(f"Storing memory: {content} (importance: {importance})")
           return {"status": "stored", "content": content}

       async def get_conversation_history(self) -> str:
           """Get recent conversation history as JSON"""
           import json
           from backend.models.database import Request

           requests = await self.db.execute(
               "SELECT transcript, agent_response, created_at "
               "FROM requests ORDER BY created_at DESC LIMIT 10"
           )
           history = [dict(r) for r in requests]
           return json.dumps(history, default=str)

       async def get_user_preferences(self) -> str:
           """Get user preferences"""
           import json
           # TODO: Implement preference storage
           return json.dumps({
               "default_channel": "slack",
               "timezone": "America/New_York"
           })

   # FastAPI Router for MCP endpoints
   mcp_router = APIRouter(prefix="/mcp")

   @mcp_router.post("/")
   async def mcp_endpoint(request: Request):
       """
       MCP JSON-RPC endpoint
       Claude sends JSON-RPC 2.0 requests here
       """
       from fastapi.responses import JSONResponse

       body = await request.json()
       mcp_server = request.app.state.mcp_server

       # Handle JSON-RPC request
       response = await mcp_server.server.handle_request(body)
       return JSONResponse(response)
   ```

4. **Update FastAPI Application**

   File: `/backend/main.py`
   ```python
   from backend.mcp.server import OrbitMCPServer, mcp_router

   @asynccontextmanager
   async def lifespan(app: FastAPI):
       # Initialize existing services
       await initialize_services()

       # Initialize MCP Server
       from backend.models.database import get_db
       db = await get_db()
       app.state.mcp_server = OrbitMCPServer(db)

       logger.info("MCP Server initialized")

       yield

       # Cleanup
       await cleanup_services()

   app = FastAPI(lifespan=lifespan)

   # Add MCP router
   app.include_router(mcp_router)
   ```

5. **Add MCP Server to Claude Code**

   After deploying your FastAPI app:
   ```bash
   # For local development
   claude mcp add --transport http orbit-memory http://localhost:8000/mcp

   # For deployed app
   claude mcp add --transport http orbit-memory https://your-app.railway.app/mcp
   ```

   Or create `.mcp.json` in your project root:
   ```json
   {
     "mcpServers": {
       "orbit-memory": {
         "type": "http",
         "url": "http://localhost:8000/mcp"
       }
     }
   }
   ```

### Phase 2: Memory Server Implementation (Week 1-2)

1. **Add pgvector Extension to PostgreSQL**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;

   CREATE TABLE conversation_memories (
       id SERIAL PRIMARY KEY,
       user_id INTEGER REFERENCES users(id),
       content TEXT NOT NULL,
       embedding vector(1536),
       metadata JSONB,
       importance FLOAT DEFAULT 0.5,
       created_at TIMESTAMP DEFAULT NOW(),
       accessed_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX ON conversation_memories USING ivfflat (embedding vector_cosine_ops);
   ```

2. **Create Memory Server**
   File: `/backend/services/mcp_servers/memory.py`
   ```python
   from mcp import Server, Tool
   from anthropic import Anthropic
   import numpy as np

   class MemoryServer(Server):
       def __init__(self, db):
           super().__init__("memory")
           self.db = db
           self.client = Anthropic()

       async def embed_text(self, text: str) -> List[float]:
           """Generate embedding for text"""
           # Use Voyage AI or OpenAI embeddings
           response = await self.client.embeddings.create(
               model="voyage-3",
               input=text
           )
           return response.data[0].embedding

       async def store_memory(self, content: str, metadata: dict = None, importance: float = 0.5):
           """Store a memory with embedding"""
           embedding = await self.embed_text(content)

           query = """
               INSERT INTO conversation_memories (user_id, content, embedding, metadata, importance)
               VALUES (:user_id, :content, :embedding, :metadata, :importance)
           """
           await self.db.execute(query, {
               "user_id": 1,  # Current user
               "content": content,
               "embedding": embedding,
               "metadata": metadata or {},
               "importance": importance
           })

       async def retrieve_memories(self, query: str, limit: int = 5) -> List[Dict]:
           """Semantic search for relevant memories"""
           query_embedding = await self.embed_text(query)

           sql = """
               SELECT content, metadata, importance, created_at,
                      1 - (embedding <=> :embedding) AS similarity
               FROM conversation_memories
               WHERE user_id = :user_id
               ORDER BY similarity DESC
               LIMIT :limit
           """

           results = await self.db.fetch_all(sql, {
               "embedding": query_embedding,
               "user_id": 1,
               "limit": limit
           })

           return [dict(r) for r in results]

       def get_tools(self) -> List[Tool]:
           return [
               Tool(
                   name="store_memory",
                   description="Store important information for future reference",
                   inputSchema={
                       "type": "object",
                       "properties": {
                           "content": {"type": "string"},
                           "importance": {"type": "number", "default": 0.5}
                       },
                       "required": ["content"]
                   },
                   handler=self.store_memory
               ),
               Tool(
                   name="retrieve_memories",
                   description="Search past conversations for relevant context",
                   inputSchema={
                       "type": "object",
                       "properties": {
                           "query": {"type": "string"},
                           "limit": {"type": "number", "default": 5}
                       },
                       "required": ["query"]
                   },
                   handler=self.retrieve_memories
               )
           ]
   ```

3. **Integrate Memory into Agent Flow**
   File: `/backend/services/agent.py`
   ```python
   async def process_request(
       self,
       transcript: str,
       chat_history: List[Dict[str, str]],
       mcp_manager: MCPManager  # Add parameter
   ) -> AgentResponse:
       # Retrieve relevant memories via MCP
       memories = await mcp_manager.servers["memory"].retrieve_memories(
           query=transcript,
           limit=5
       )

       # Format memories for context
       memory_context = "\n\n".join([
           f"[Remembered from {m['created_at']}]: {m['content']}"
           for m in memories if m['similarity'] > 0.7
       ])

       # Add to system prompt or as a system message
       if memory_context:
           history_messages.insert(0, SystemMessage(
               content=f"Relevant context from past conversations:\n{memory_context}"
           ))

       # Continue with existing agent logic...
       result = await agent_executor.ainvoke({
           "input": transcript,
           "chat_history": history_messages
       })

       # Store important information as memory
       if should_remember(result):
           await mcp_manager.servers["memory"].store_memory(
               content=f"User: {transcript}\nAssistant: {result['output']}",
               metadata={"request_id": request_id},
               importance=calculate_importance(result)
           )

       return AgentResponse(...)
   ```

### Phase 3: Enhanced Contacts Server (Week 2)

File: `/backend/services/mcp_servers/contacts.py`
```python
from mcp import Server, Tool
from fuzzywuzzy import fuzz

class ContactsServer(Server):
    def __init__(self, db):
        super().__init__("contacts")
        self.db = db

    async def search_contacts(self, query: str, threshold: int = 70) -> List[Dict]:
        """Fuzzy search for contacts"""
        # Get all contacts from DB
        contacts = await self.db.fetch_all("SELECT * FROM contacts")

        # Score each contact
        scored = []
        for contact in contacts:
            score = max(
                fuzz.ratio(query.lower(), contact['name'].lower()),
                fuzz.ratio(query.lower(), contact.get('nickname', '').lower())
            )
            if score >= threshold:
                scored.append((score, dict(contact)))

        # Return sorted by score
        scored.sort(reverse=True)
        return [c[1] for c in scored[:5]]

    async def get_contact_preferences(self, contact_id: int) -> Dict:
        """Get communication preferences for a contact"""
        # Check message history to infer preferences
        stats = await self.db.fetch_one("""
            SELECT
                COUNT(*) FILTER (WHERE message_type = 'sms') as sms_count,
                COUNT(*) FILTER (WHERE message_type = 'email') as email_count,
                COUNT(*) FILTER (WHERE message_type = 'slack') as slack_count,
                MAX(sent_at) as last_contact
            FROM messages
            WHERE recipient_id = :contact_id
        """, {"contact_id": contact_id})

        return dict(stats)

    def get_tools(self) -> List[Tool]:
        return [
            Tool(
                name="search_contacts",
                description="Find contacts by name with fuzzy matching",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"}
                    },
                    "required": ["query"]
                },
                handler=self.search_contacts
            ),
            Tool(
                name="get_contact_preferences",
                description="Get preferred communication channel for a contact",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "contact_id": {"type": "integer"}
                    },
                    "required": ["contact_id"]
                },
                handler=self.get_contact_preferences
            )
        ]
```

### Phase 4: Update Agent to Use MCP Tools (Week 2)

File: `/backend/services/agent.py`
```python
def _create_agent(self, mcp_manager: MCPManager):
    """Create the LangChain agent with MCP tools"""

    # Get existing tools
    existing_tools = [
        SendSMSTool(),
        SendEmailTool(),
        SendSlackMessageTool(),
        SendWhatsAppMessageTool(),
    ]

    # Add MCP tools
    mcp_tools = mcp_manager.get_tools()
    all_tools = existing_tools + mcp_tools

    # Create agent with all tools
    agent = create_tool_calling_agent(
        llm=self.llm,
        tools=all_tools,
        prompt=prompt
    )

    return AgentExecutor(
        agent=agent,
        tools=all_tools,
        max_iterations=5,
        verbose=True
    )
```

## Expected Improvements

### Before MCP:
```
User: "Send a message to John"
Agent: "I found multiple Johns in your contacts. Which one?"
User: "The one I messaged last week about the project"
Agent: "I don't have access to past message context. Can you specify?"
```

### After MCP:
```
User: "Send a message to John"
Agent: [Retrieves memory: "Last week discussed React project with John Smith"]
Agent: "I'll send a Slack message to John Smith about the project. What should I say?"
User: "Ask about the deployment timeline"
Agent: [Checks memory for project context]
Agent: "I'll send: 'Hi John, following up on our React project discussion - what's the timeline looking like for deployment?'"
```

## Migration Path

1. **Week 1**:
   - Set up MCP infrastructure
   - Implement Memory Server with embeddings
   - Test with simple memory storage/retrieval

2. **Week 2**:
   - Migrate contacts to MCP server
   - Integrate both servers into agent flow
   - Add automatic memory persistence logic

3. **Week 3**:
   - Add Calendar MCP server (optional)
   - Tune memory importance scoring
   - Performance optimization

4. **Week 4**:
   - User testing and refinement
   - Documentation
   - Monitoring and observability

## Configuration

Add to `.env`:
```bash
# MCP Configuration
MCP_MEMORY_ENABLED=true
MCP_CONTACTS_ENABLED=true
MCP_CALENDAR_ENABLED=false
MCP_DOCUMENTS_ENABLED=false

# Embeddings (for memory)
VOYAGE_API_KEY=your_voyage_key
# or
OPENAI_API_KEY=your_openai_key (for embeddings)

# Vector DB
POSTGRES_VECTOR_DIMENSIONS=1536
```

## Database Migration

Create migration file: `/backend/alembic/versions/xxx_add_mcp_support.py`
```python
def upgrade():
    # Add pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')

    # Create memories table
    op.create_table(
        'conversation_memories',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(1536)),
        sa.Column('metadata', JSONB()),
        sa.Column('importance', sa.Float(), default=0.5),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('accessed_at', sa.DateTime(), server_default=sa.func.now())
    )

    # Add index for vector similarity search
    op.execute(
        'CREATE INDEX conversation_memories_embedding_idx '
        'ON conversation_memories USING ivfflat (embedding vector_cosine_ops)'
    )

    # Migrate contacts from JSON to DB (optional)
    op.create_table(
        'contacts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('nickname', sa.String()),
        sa.Column('phone', sa.String()),
        sa.Column('email', sa.String()),
        sa.Column('slack_user_id', sa.String()),
        sa.Column('whatsapp', sa.String()),
        sa.Column('preferences', JSONB()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )
```

## Testing Strategy

1. **Unit Tests**: Test each MCP server independently
2. **Integration Tests**: Test agent with MCP context
3. **E2E Tests**: Full voice flow with memory retrieval
4. **Performance Tests**: Embedding generation and vector search latency

## Monitoring

Add to observability:
- MCP server response times
- Memory retrieval accuracy (user feedback)
- Embedding generation costs
- Context relevance scores

## Cost Considerations

- **Embeddings**: ~$0.00013 per 1K tokens (Voyage AI) or ~$0.0001 (OpenAI)
- **Storage**: Minimal (vectors are small)
- **Latency**: +50-200ms per request for memory retrieval
- **ROI**: Significantly better user experience and context awareness

## Resources

- **MCP Specification**: https://modelcontextprotocol.io/specification/2025-11-25
- **MCP Documentation**: https://modelcontextprotocol.io
- **Python SDK**: https://github.com/modelcontextprotocol/python-sdk
- **Example Servers**: https://github.com/modelcontextprotocol/servers
- **pgvector**: https://github.com/pgvector/pgvector
- **Claude Code MCP Guide**: https://code.claude.com/docs/en/mcp.md

## Key Takeaways - How MCP Actually Works

### The Correct Mental Model:

1. **Claude Code IS the MCP Client**
   - You don't implement an MCP client in your app
   - Claude connects TO your servers
   - Your app provides the MCP server endpoints

2. **Your FastAPI App IS an MCP Server**
   - Exposes tools, resources, and prompts
   - Receives JSON-RPC 2.0 requests from Claude
   - Returns structured data/context

3. **Connection Flow**:
   ```
   User talks to Claude Code
        ↓
   Claude decides it needs context
        ↓
   Claude sends JSON-RPC request to your MCP server
        ↓
   Your server returns memories/contacts/data
        ↓
   Claude uses that context to respond
   ```

4. **How You Use It**:
   ```bash
   # Step 1: Deploy your FastAPI app with MCP endpoints
   # Step 2: Register it with Claude Code
   claude mcp add --transport http orbit https://your-app.com/mcp

   # Step 3: Use it naturally
   > "Send a message to John about the project"
   # Claude automatically calls your MCP server's retrieve_memories tool
   # Gets context about "John" and "the project"
   # Responds with full context
   ```

5. **What Gets Exposed via MCP**:
   - **Tools**: Functions Claude can call (`retrieve_memories`, `search_contacts`)
   - **Resources**: Static/dynamic data Claude can reference (`@orbit:history`)
   - **Prompts**: Workflows that become slash commands (`/mcp__orbit__summarize`)

### Example User Experience After MCP:

**Before MCP**:
```
User: "Message John about yesterday's discussion"
Agent: "I found 3 Johns. Which one? Also, I don't remember yesterday's discussion."
```

**After MCP**:
```
User: "Message John about yesterday's discussion"
Claude → Calls retrieve_memories("yesterday's discussion with John")
Claude → Calls search_contacts("John") with context
Agent: "I'll send a Slack message to John Smith about the React deployment
       timeline we discussed yesterday. What would you like to say?"
```

### Quick Start Checklist:

- [ ] Install MCP SDK: `pip install mcp`
- [ ] Create `/backend/mcp/server.py` with OrbitMCPServer class
- [ ] Add MCP router to FastAPI app
- [ ] Test locally: `claude mcp add --transport http orbit http://localhost:8000/mcp`
- [ ] Try asking Claude to use the memory tool
- [ ] Add embeddings for semantic search (Phase 2)
- [ ] Deploy and update MCP URL to production
- [ ] Share `.mcp.json` with team for consistent setup
