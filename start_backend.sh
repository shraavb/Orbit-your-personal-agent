#!/bin/bash
# Startup script for Orbit Voice Agent backend
# This script ensures placeholder environment variables don't override .env file

# Unset any placeholder environment variables
unset ANTHROPIC_API_KEY
unset LANGSMITH_API_KEY
unset ELEVENLABS_API_KEY

# Activate virtual environment and start backend
source backend/venv/bin/activate
python -m backend.main
