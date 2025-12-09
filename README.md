# Orbit - Your Personal Voice Agent

Orbit is your personal voice-first agent that handles the busywork of everyday life. Use your voice to send messages, schedule meetings, take notes, and manage errands -- all in one fast, reliable assistant. Orbit keeps everything in motion so you can stay focused on what actually matters.

## Features (MVP - Phase 1)

- **Voice Interface**: Speak naturally to interact with your agent
- **Speech-to-Text**: Self-hosted Whisper model for accurate transcription
- **AI Agent**: Claude-powered LangChain agent for intent understanding
- **Text-to-Speech**: Natural voice responses via ElevenLabs
- **Contact Management**: Simple JSON-based contact resolution
- **LangSmith Tracing**: Built-in observability for debugging and monitoring

## Coming Soon (Phase 2)

- Messaging (SMS, Email, WhatsApp, Slack)
- Calendar integration (Google Calendar)
- Meeting notes and summaries
- Grocery ordering (Instacart)

## Architecture

```
User (Web App)
  → Voice Recording (Browser)
  → Backend (FastAPI)
  → Whisper ASR (self-hosted)
  → LangChain Agent (Claude Sonnet 4.5)
  → Tool Execution
  → ElevenLabs TTS
  → Voice Response
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- Docker & Docker Compose
- API Keys:
  - Anthropic API key (for Claude)
  - LangSmith API key (for observability)
  - ElevenLabs API key (for TTS)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/orbit-your-personal-agent.git
cd orbit-your-personal-agent
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Required
ANTHROPIC_API_KEY="your-anthropic-api-key"
LANGSMITH_API_KEY="your-langsmith-api-key"
DEEPGRAM_API_KEY="your-deepgram-api-key"

# Optional (for Phase 2)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
# ... etc
```

### 3. Start the database

```bash
docker-compose up -d postgres
```

### 4. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Start the backend server

```bash
python -m backend.main
```

The backend will:
- Initialize the database
- Load the Whisper model (first run may take a few minutes)
- Start on http://localhost:8000

### 6. Set up the frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on http://localhost:5173

### 7. Open the app

Navigate to http://localhost:5173 in your browser and start talking to Orbit!

## Usage

1. **Hold to Talk**: Press and hold the blue button, speak your request, then release
2. **View Response**: See the transcription and Orbit's response
3. **Hear Response**: Audio automatically plays (toggle audio on/off as needed)
4. **View History**: Scroll down to see your conversation history

## Project Structure

```
orbit/
├── backend/                 # Python FastAPI backend
│   ├── api/                # API endpoints
│   │   ├── health.py      # Health checks
│   │   └── voice.py       # Voice processing endpoints
│   ├── services/           # Core services
│   │   ├── asr.py         # Whisper ASR
│   │   ├── agent.py       # LangChain agent
│   │   ├── tts.py         # ElevenLabs TTS
│   │   └── contacts.py    # Contact resolution
│   ├── tools/             # LangChain tools (Phase 2)
│   ├── models/            # Database models
│   ├── integrations/      # External API clients
│   ├── prompts/           # Agent prompts
│   ├── data/              # Data files
│   │   └── contacts.json  # Contact list
│   ├── config.py          # Configuration
│   ├── main.py            # FastAPI app
│   └── requirements.txt   # Dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── api/           # API client
│   │   └── App.tsx        # Main app
│   └── package.json
├── docker-compose.yml      # Local development services
├── .env.example           # Environment template
└── README.md              # This file
```

## Configuration

### Whisper Model

Edit `.env` to configure the Whisper model:

```env
WHISPER_MODEL_SIZE="base"  # Options: tiny, base, small, medium, large
WHISPER_DEVICE="cpu"       # cpu or cuda (if you have GPU)
WHISPER_COMPUTE_TYPE="int8"  # int8, float16, float32
```

Recommended:
- CPU only: `base` model with `int8`
- GPU available: `medium` model with `float16`

### Contacts

Edit `backend/data/contacts.json` to add your contacts:

```json
{
  "John": {
    "full_name": "John Smith",
    "phone": "+15551234567",
    "email": "john.smith@example.com",
    "slack_user_id": null
  }
}
```

## Troubleshooting

### Whisper model takes too long

- Use a smaller model: `WHISPER_MODEL_SIZE="tiny"`
- Use a GPU if available: `WHISPER_DEVICE="cuda"`

### Audio not playing

- Check browser permissions for audio playback
- Toggle audio on/off in the UI
- Check browser console for errors

### Database connection error

```bash
# Make sure PostgreSQL is running
docker-compose up -d postgres

# Check connection
docker-compose logs postgres
```

### API errors

- Check that all API keys are set in `.env`
- Verify API keys are valid
- Check backend logs for specific errors

## Development

### Running tests

```bash
cd backend
pytest
```

### Database migrations

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Adding new tools (Phase 2)

1. Create tool in `backend/tools/`
2. Implement as LangChain `BaseTool`
3. Add to agent in `backend/services/agent.py`
4. Update system prompts in `backend/prompts/system.py`

## Roadmap

### Phase 1: Core Infrastructure (Current)
- [x] Voice recording interface
- [x] Whisper ASR integration
- [x] LangChain + Claude agent
- [x] ElevenLabs TTS
- [x] Contact resolution
- [x] LangSmith tracing

### Phase 2: Messaging Tools
- [ ] Twilio SMS integration
- [ ] Gmail API integration
- [ ] Slack API integration
- [ ] WhatsApp via Twilio
- [ ] Confirmation flow
- [ ] Error handling

### Phase 3: Polish & Testing
- [ ] Conversation context
- [ ] Multi-turn corrections
- [ ] Comprehensive error handling
- [ ] Unit & integration tests
- [ ] E2E tests
- [ ] Documentation

### Phase 4: Calendar & Notes
- [ ] Google Calendar integration
- [ ] Meeting transcription
- [ ] Note summarization
- [ ] Action item extraction

### Phase 5: Grocery Ordering
- [ ] Instacart API integration
- [ ] Product search
- [ ] Cart management
- [ ] Checkout flow

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- OpenAI Whisper for ASR
- Anthropic Claude for the LLM
- LangChain for agent framework
- ElevenLabs for TTS
- FastAPI for the backend
- React for the frontend
