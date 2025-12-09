"""Automatic Speech Recognition (ASR) service using Whisper."""

import io
import base64
import tempfile
from typing import Optional

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    print("WARNING: Whisper not available. ASR will not work. Install with Python 3.9-3.12.")

from backend.config import settings


class ASRService:
    """
    ASR service using OpenAI's Whisper model.

    This service transcribes audio to text using a locally-run Whisper model.
    """

    def __init__(self):
        """Initialize the Whisper model."""
        self.model: Optional[whisper.Whisper] = None
        self._load_model()

    def _load_model(self):
        """Load the Whisper model."""
        if not WHISPER_AVAILABLE:
            print("Whisper not available - skipping model load")
            self.model = None
            return

        print(f"Loading Whisper model: {settings.whisper_model_size}")

        # Load model (will download on first run)
        self.model = whisper.load_model(
            settings.whisper_model_size,
            device=settings.whisper_device,
        )

        print("Whisper model loaded successfully")

    def transcribe_audio(
        self,
        audio_data: bytes,
        language: str = "en"
    ) -> str:
        """
        Transcribe audio to text.

        Args:
            audio_data: Raw audio bytes (any format supported by ffmpeg)
            language: Language code (default: "en" for English)

        Returns:
            Transcribed text

        Raises:
            Exception: If transcription fails
        """
        if not WHISPER_AVAILABLE:
            raise RuntimeError("Whisper not installed. Please use Python 3.9-3.12 and install openai-whisper.")

        if not self.model:
            raise RuntimeError("Whisper model not loaded")

        try:
            # Save audio data to temporary file
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_path = temp_file.name

            # Transcribe using OpenAI Whisper
            result = self.model.transcribe(
                temp_path,
                language=language,
                fp16=False if settings.whisper_device == "cpu" else True,
            )

            transcript = result["text"].strip()

            print(f"Detected language: {result.get('language', language)}")
            print(f"Transcript: {transcript}")

            return transcript

        except Exception as e:
            print(f"ASR error: {str(e)}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")
        finally:
            # Clean up temp file
            try:
                import os
                os.unlink(temp_path)
            except:
                pass

    def transcribe_base64(
        self,
        audio_base64: str,
        language: str = "en"
    ) -> str:
        """
        Transcribe base64-encoded audio to text.

        Args:
            audio_base64: Base64-encoded audio data
            language: Language code (default: "en")

        Returns:
            Transcribed text
        """
        # Decode base64 to bytes
        audio_data = base64.b64decode(audio_base64)
        return self.transcribe_audio(audio_data, language)


# Global ASR service instance
_asr_service: Optional[ASRService] = None


def get_asr_service() -> ASRService:
    """
    Get or create the global ASR service instance.

    Returns:
        ASRService instance
    """
    global _asr_service
    if _asr_service is None:
        _asr_service = ASRService()
    return _asr_service
