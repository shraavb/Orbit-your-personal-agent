"""Text-to-Speech (TTS) service using ElevenLabs."""

import base64
import re
import io
from typing import Optional, Dict, Any, List, Tuple
from elevenlabs import ElevenLabs
from backend.config import settings

try:
    from pydub import AudioSegment
    from pydub.generators import WhiteNoise
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    print("WARNING: pydub not available. Audio censoring will be disabled.")


def find_sensitive_data_ranges(text: str) -> List[Tuple[int, int, str]]:
    """
    Find character ranges of sensitive data (emails, phone numbers) in text.

    Args:
        text: Text to search for sensitive data

    Returns:
        List of (start_index, end_index, type) tuples for sensitive data
    """
    ranges = []

    # Find email addresses
    email_pattern = r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'
    for match in re.finditer(email_pattern, text):
        ranges.append((match.start(), match.end(), 'email'))

    # Find phone numbers (various formats)
    # Matches: +1234567890, (555) 123-4567, 555-123-4567, +1-555-123-4567, etc.
    phone_pattern = r'[\+\(]?\d{1,4}[\)\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}'
    for match in re.finditer(phone_pattern, text):
        # Only match if it looks substantial enough (at least 10 digits)
        digits = re.sub(r'\D', '', match.group())
        if len(digits) >= 10:
            ranges.append((match.start(), match.end(), 'phone'))

    return ranges


def generate_beep_audio(duration_ms: int, sample_rate: int = 44100) -> AudioSegment:
    """
    Generate a soft beep tone for censoring.

    Args:
        duration_ms: Duration in milliseconds
        sample_rate: Audio sample rate (default: 44100 Hz)

    Returns:
        AudioSegment containing soft beep tone
    """
    if not PYDUB_AVAILABLE:
        return None

    try:
        from pydub.generators import Sine

        # Generate a soft sine wave tone at 800 Hz (gentle, non-jarring frequency)
        beep = Sine(800).to_audio_segment(duration=duration_ms)

        # Apply fade in/out for smoother sound (10ms fades)
        fade_duration = min(10, duration_ms // 4)
        beep = beep.fade_in(fade_duration).fade_out(fade_duration)

        # Reduce volume to -25dB so it's subtle and pleasant
        beep = beep - 25

        return beep
    except Exception as e:
        print(f"Error generating beep: {e}")
        # Fallback to silence if beep generation fails
        return AudioSegment.silent(duration=duration_ms)


def censor_audio_segments(
    audio_base64: str,
    text: str,
    alignment: Dict[str, Any]
) -> str:
    """
    Replace audio segments containing sensitive data with beep/white noise.

    Args:
        audio_base64: Base64-encoded MP3 audio
        text: Original text that was synthesized
        alignment: Character-level timing data from TTS

    Returns:
        Base64-encoded censored audio
    """
    if not PYDUB_AVAILABLE or not alignment:
        # No pydub or no alignment data - return original
        return audio_base64

    try:
        # Find sensitive data ranges
        sensitive_ranges = find_sensitive_data_ranges(text)

        if not sensitive_ranges:
            # No sensitive data to censor
            return audio_base64

        # Decode audio
        audio_bytes = base64.b64decode(audio_base64)
        audio = AudioSegment.from_mp3(io.BytesIO(audio_bytes))

        # Get character timing data
        characters = alignment.get('characters', [])
        start_times = alignment.get('character_start_times_seconds', [])
        end_times = alignment.get('character_end_times_seconds', [])

        if not characters or not start_times or not end_times:
            return audio_base64

        # For each sensitive range, replace the corresponding audio segment
        for start_char, end_char, data_type in sensitive_ranges:
            # Find the time range for this character range
            if start_char < len(start_times) and end_char <= len(end_times):
                start_time_ms = int(start_times[start_char] * 1000)
                end_time_ms = int(end_times[min(end_char - 1, len(end_times) - 1)] * 1000)

                duration_ms = end_time_ms - start_time_ms

                print(f"Censoring {data_type} at chars {start_char}-{end_char} ({start_time_ms}-{end_time_ms}ms)")

                # Generate beep for this duration
                beep = generate_beep_audio(duration_ms, sample_rate=audio.frame_rate)

                # Replace the segment
                # audio = audio[:start_time_ms] + beep + audio[end_time_ms:]
                # Better approach: overlay beep to preserve timing
                audio = audio[:start_time_ms] + beep + audio[end_time_ms:]

        # Export censored audio back to MP3
        output_buffer = io.BytesIO()
        audio.export(output_buffer, format='mp3', bitrate='128k')
        censored_audio_bytes = output_buffer.getvalue()

        # Re-encode to base64
        censored_base64 = base64.b64encode(censored_audio_bytes).decode('utf-8')

        print(f"Audio censoring complete: {len(sensitive_ranges)} segments censored")

        return censored_base64

    except Exception as e:
        print(f"Error censoring audio: {e}")
        # Return original if censoring fails
        return audio_base64


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

            # Apply audio censoring for sensitive data (emails, phone numbers)
            if result["alignment"]:
                result["audio_base64"] = censor_audio_segments(
                    result["audio_base64"],
                    text,
                    result["alignment"]
                )

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
