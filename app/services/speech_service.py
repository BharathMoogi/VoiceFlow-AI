"""
Speech-to-Text service with a provider-based abstract pattern.

Designed for easy future integration with providers such as:
  - Whisper (OpenAI)
  - Google Cloud Speech-to-Text
  - Azure Cognitive Services Speech
"""

from abc import ABC, abstractmethod
from typing import Optional
import io
import logging

from fastapi import HTTPException, UploadFile, status

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Abstract base provider
# ---------------------------------------------------------------------------

class SpeechProvider(ABC):
    """
    Abstract base class for all Speech-to-Text providers.

    To add a new provider, subclass this and implement `transcribe`.
    """

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, filename: str) -> str:
        """
        Transcribe audio bytes to text.

        Args:
            audio_bytes: Raw audio data.
            filename:    Original filename (used to infer format/mime type).

        Returns:
            Transcribed text string.

        Raises:
            HTTPException: On provider-level errors.
        """
        ...


# ---------------------------------------------------------------------------
# Built-in stub provider (no external dependency required)
# ---------------------------------------------------------------------------

class MockSpeechProvider(SpeechProvider):
    """
    Stub provider used as the default when no real provider is configured.

    Replace this with a real provider (WhisperProvider, GoogleSpeechProvider,
    etc.) by setting the active provider on SpeechService.
    """

    async def transcribe(self, audio_bytes: bytes, filename: str) -> str:
        logger.warning(
            "MockSpeechProvider is active. "
            "Configure a real provider for production use."
        )
        return (
            "[MockSpeechProvider] Transcription not available. "
            "Please configure a real Speech-to-Text provider."
        )


# ---------------------------------------------------------------------------
# Whisper provider (optional — requires `openai-whisper` or `openai` package)
# ---------------------------------------------------------------------------

class WhisperProvider(SpeechProvider):
    """
    Provider that uses OpenAI's Whisper model for transcription.

    Install dependency:
        pip install openai

    Set environment variable:
        OPENAI_API_KEY=sk-...
    """

    def __init__(self) -> None:
        try:
            import openai  # noqa: F401
            self._openai = openai
        except ImportError as exc:
            raise RuntimeError(
                "openai package is required for WhisperProvider. "
                "Install it with: pip install openai"
            ) from exc

    async def transcribe(self, audio_bytes: bytes, filename: str) -> str:
        """Transcribe audio using OpenAI Whisper via the Transcriptions API."""
        try:
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = filename  # Whisper API uses name to detect format

            client = self._openai.AsyncOpenAI()
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
            return response.text
        except Exception as exc:
            logger.error("WhisperProvider transcription failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Whisper transcription failed: {exc}",
            ) from exc


# ---------------------------------------------------------------------------
# Google Speech-to-Text provider (optional — requires `google-cloud-speech`)
# ---------------------------------------------------------------------------

class GoogleSpeechProvider(SpeechProvider):
    """
    Provider that uses Google Cloud Speech-to-Text.

    Install dependency:
        pip install google-cloud-speech

    Authentication:
        Set GOOGLE_APPLICATION_CREDENTIALS environment variable to the path
        of your service-account JSON key file.
    """

    def __init__(self, language_code: str = "en-US") -> None:
        self.language_code = language_code
        try:
            from google.cloud import speech as google_speech  # noqa: F401
            self._speech = google_speech
        except ImportError as exc:
            raise RuntimeError(
                "google-cloud-speech package is required for GoogleSpeechProvider. "
                "Install it with: pip install google-cloud-speech"
            ) from exc

    async def transcribe(self, audio_bytes: bytes, filename: str) -> str:
        """Transcribe audio using Google Cloud Speech-to-Text."""
        try:
            client = self._speech.SpeechAsyncClient()

            audio = self._speech.RecognitionAudio(content=audio_bytes)
            config = self._speech.RecognitionConfig(
                encoding=self._speech.RecognitionConfig.AudioEncoding.LINEAR16,
                language_code=self.language_code,
            )

            response = await client.recognize(config=config, audio=audio)

            transcript = " ".join(
                result.alternatives[0].transcript
                for result in response.results
                if result.alternatives
            )
            return transcript or ""
        except Exception as exc:
            logger.error("GoogleSpeechProvider transcription failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Google Speech transcription failed: {exc}",
            ) from exc


# ---------------------------------------------------------------------------
# SpeechService — the public interface used by endpoints
# ---------------------------------------------------------------------------

class SpeechService:
    """
    High-level Speech-to-Text service.

    Delegates all provider-specific work to the configured `SpeechProvider`.
    Swap providers without changing endpoint code:

        speech_service.set_provider(WhisperProvider())
    """

    def __init__(self, provider: Optional[SpeechProvider] = None) -> None:
        self._provider: SpeechProvider = provider or MockSpeechProvider()

    def set_provider(self, provider: SpeechProvider) -> None:
        """
        Replace the active provider at runtime.

        Args:
            provider: Any concrete SpeechProvider implementation.
        """
        self._provider = provider
        logger.info("SpeechService provider switched to %s", type(provider).__name__)

    async def transcribe_audio(self, file: UploadFile) -> str:
        """
        Read an uploaded audio file and return its transcription.

        Args:
            file: FastAPI UploadFile object from a multipart/form-data request.

        Returns:
            Transcribed text from the audio file.

        Raises:
            HTTPException 400: If the file is empty or not readable.
            HTTPException 502: If the underlying provider fails.
        """
        if file is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No audio file provided.",
            )

        try:
            audio_bytes = await file.read()
        except Exception as exc:
            logger.error("Failed to read uploaded audio file: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not read the uploaded audio file.",
            ) from exc

        if not audio_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded audio file is empty.",
            )

        filename = file.filename or "audio.wav"
        logger.info(
            "Transcribing '%s' (%d bytes) with %s",
            filename,
            len(audio_bytes),
            type(self._provider).__name__,
        )

        return await self._provider.transcribe(audio_bytes, filename)


# ---------------------------------------------------------------------------
# Singleton instance — import this in your endpoints
# ---------------------------------------------------------------------------

speech_service = SpeechService()
