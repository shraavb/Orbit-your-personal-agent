"""Text-to-Speech (TTS) service using ElevenLabs."""

import base64
from typing import Optional, Dict, Any
from elevenlabs import ElevenLabs
from backend.config import settings


class TTSService:
    """
    TTS service using ElevenLabs text-to-speech API.

    This service converts text to natural-sounding speech using ElevenLabs' voices.
    """

    def __init__(self):
        """Initialize the TTS service."""
        self.client = ElevenLabs(api_key=settings.elevenlabs_api_key)
        # Default voice - "Rachel" is a great natural-sounding female voice
        # Other popular voices: "Adam", "Antoni", "Arnold", "Bella", "Domi", "Elli", "Josh"
        self.default_voice_id = settings.elevenlabs_voice_id or "21m00Tcm4TlvDq8ikWAM"  # Rachel

    async def text_to_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> bytes:
        """
        Convert text to speech using ElevenLabs API.

        Args:
            text: Text to convert to speech
            voice_id: Optional voice ID (defaults to Rachel if not specified)

        Returns:
            Audio bytes (MP3 format)

        Raises:
            Exception: If TTS generation fails
        """
        try:
            voice_id = voice_id or self.default_voice_id

            # Generate audio using ElevenLabs
            audio_generator = self.client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id="eleven_multilingual_v2",  # High quality model
                output_format="mp3_44100_128",  # MP3 at 44.1kHz, 128kbps
            )

            # Collect all audio chunks
            audio_bytes = b"".join(chunk for chunk in audio_generator)

            return audio_bytes

        except Exception as e:
            print(f"TTS error: {str(e)}")
            raise Exception(f"Failed to generate speech: {str(e)}")

    async def text_to_speech_base64(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> str:
        """
        Convert text to speech and return as base64-encoded string.

        Args:
            text: Text to convert to speech
            voice_id: Optional voice ID

        Returns:
            Base64-encoded audio (MP3)
        """
        audio_bytes = await self.text_to_speech(text, voice_id=voice_id)
        return base64.b64encode(audio_bytes).decode("utf-8")

    async def text_to_speech_with_timestamps(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Convert text to speech and return audio with character timing data.

        Args:
            text: Text to convert to speech
            voice_id: Optional voice ID

        Returns:
            Dict containing:
            - audio_base64: Base64-encoded audio
            - alignment: Character timing data (characters, start_times, end_times)
        """
        try:
            voice_id = voice_id or self.default_voice_id

            # Use convert_with_timestamps instead of convert
            response = self.client.text_to_speech.convert_with_timestamps(
                text=text,
                voice_id=voice_id,
                model_id="eleven_multilingual_v2",
                output_format="mp3_44100_128",
            )

            result = {
                "audio_base64": response.audio_base_64,
                "alignment": None,
            }

            # Extract timing data (prefer normalized_alignment)
            if response.normalized_alignment:
                result["alignment"] = {
                    "characters": response.normalized_alignment.characters,
                    "character_start_times_seconds": response.normalized_alignment.character_start_times_seconds,
                    "character_end_times_seconds": response.normalized_alignment.character_end_times_seconds,
                }
            elif response.alignment:
                result["alignment"] = {
                    "characters": response.alignment.characters,
                    "character_start_times_seconds": response.alignment.character_start_times_seconds,
                    "character_end_times_seconds": response.alignment.character_end_times_seconds,
                }

            return result

        except Exception as e:
            print(f"TTS with timestamps error: {str(e)}")
            raise Exception(f"Failed to generate speech with timestamps: {str(e)}")

    async def close(self):
        """Cleanup method (ElevenLabs client doesn't need explicit cleanup)."""
        pass


# Global TTS service instance
_tts_service: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    """
    Get or create the global TTS service instance.

    Returns:
        TTSService instance
    """
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
