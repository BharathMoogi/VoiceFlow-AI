"""
Speech-to-Text API endpoints.

POST /speech/transcribe
    - Accepts a multipart audio file upload
    - Returns the transcribed text
    - Requires JWT authentication

POST /speech/transcribe-and-generate
    - Accepts a multipart audio file upload
    - Converts speech to text via SpeechService
    - Generates an email (subject + body) via Gemini AI
    - Saves a draft email record in the database
    - Returns transcript, email_id, subject, and body
    - Requires JWT authentication
"""

import logging
from typing import Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.schemas.email import EmailCreate, TranscribeAndGenerateResponse
from app.services.ai_service import ai_service
from app.services.email_service import email_service
from app.services.speech_service import speech_service

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Allowed audio MIME types
# ---------------------------------------------------------------------------
ALLOWED_CONTENT_TYPES = {
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/ogg",
    "audio/webm",
    "audio/flac",
    "application/octet-stream",  # generic binary uploads
}


def _validate_audio_content_type(file: UploadFile) -> None:
    """Raise 415 if the uploaded file's content type is not an accepted audio format."""
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                f"Accepted types: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}."
            ),
        )


# ---------------------------------------------------------------------------
# POST /speech/transcribe
# ---------------------------------------------------------------------------
@router.post(
    "/transcribe",
    response_model=Dict[str, str],
    summary="Transcribe audio to text",
    description=(
        "Upload an audio file (WAV, MP3, OGG, FLAC, WEBM, etc.) and receive "
        "the transcribed text. Requires a valid JWT bearer token."
    ),
)
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file to transcribe"),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, str]:
    """
    Transcribe an uploaded audio file to text.

    - **file**: Multipart audio file (WAV, MP3, OGG, FLAC, WEBM …)

    Returns:
        `{ "transcript": "<transcribed text>" }`
    """
    _validate_audio_content_type(file)
    transcript = await speech_service.transcribe_audio(file)
    return {"transcript": transcript}


# ---------------------------------------------------------------------------
# POST /speech/transcribe-and-generate
# ---------------------------------------------------------------------------
@router.post(
    "/transcribe-and-generate",
    response_model=TranscribeAndGenerateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Transcribe audio, generate email, and save as draft",
    description=(
        "Full pipeline: upload audio → speech-to-text → Gemini AI generates "
        "subject & body → saved as a draft email → returns all results. "
        "Requires a valid JWT bearer token."
    ),
)
async def transcribe_and_generate(
    file: UploadFile = File(..., description="Audio file to transcribe"),
    recipient: Optional[str] = Form(
        default=None,
        description="Optional recipient email address for the saved draft.",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> TranscribeAndGenerateResponse:
    """
    Full speech → email pipeline.

    **Steps:**
    1. Validate & read the uploaded audio file.
    2. Transcribe audio → text via the active `SpeechService` provider.
    3. Pass transcript as prompt to Gemini AI to generate `subject` and `body`.
    4. Persist the email as a **draft** in the database (linked to the current user).
    5. Return the combined result.

    **Form fields:**
    - **file** *(required)*: Audio file (WAV, MP3, OGG, FLAC, WEBM …)
    - **recipient** *(optional)*: Recipient email address; stored in the draft record.

    **Response:**
    ```json
    {
      "transcript": "...",
      "email_id":   "uuid",
      "subject":    "...",
      "body":       "...",
      "status":     "draft",
      "created_at": "2024-01-01T00:00:00"
    }
    ```
    """
    # ------------------------------------------------------------------
    # Step 1 — Validate content type
    # ------------------------------------------------------------------
    _validate_audio_content_type(file)

    # ------------------------------------------------------------------
    # Step 2 — Speech → Text
    # ------------------------------------------------------------------
    logger.info(
        "User %s: starting transcribe-and-generate pipeline for file '%s'",
        current_user.id,
        file.filename,
    )

    try:
        transcript = await speech_service.transcribe_audio(file)
    except HTTPException:
        raise  # re-raise 400/502 from speech service as-is
    except Exception as exc:
        logger.error("Unexpected transcription error for user %s: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during audio transcription.",
        ) from exc

    if not transcript or not transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Transcription returned empty text. Please provide a clearer audio recording.",
        )

    logger.info("User %s: transcription complete (%d chars)", current_user.id, len(transcript))

    # ------------------------------------------------------------------
    # Step 3 — Text → AI-generated email
    # ------------------------------------------------------------------
    try:
        generated = await ai_service.generate_email(prompt=transcript)
    except HTTPException:
        raise  # re-raise 503/500 from AI service as-is
    except Exception as exc:
        logger.error("Unexpected AI generation error for user %s: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during email generation.",
        ) from exc

    subject: str = generated.get("subject", "")
    body: str = generated.get("body", "")

    if not subject or not body:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service returned an incomplete email response (missing subject or body).",
        )

    logger.info("User %s: AI email generated, subject='%s'", current_user.id, subject)

    # ------------------------------------------------------------------
    # Step 4 — Save as draft email
    # ------------------------------------------------------------------
    email_data = EmailCreate(
        recipient=recipient or "",
        subject=subject,
        body=body,
    )

    try:
        saved_email = await email_service.create_email(
            db=db,
            user_id=current_user.id,
            email_data=email_data,
        )
    except Exception as exc:
        logger.error("Failed to save draft email for user %s: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email was generated but could not be saved. Please try again.",
        ) from exc

    logger.info(
        "User %s: draft email saved (id=%s)", current_user.id, saved_email.id
    )

    # ------------------------------------------------------------------
    # Step 5 — Return combined result
    # ------------------------------------------------------------------
    return TranscribeAndGenerateResponse(
        transcript=transcript,
        email_id=saved_email.id,
        subject=saved_email.subject,
        body=saved_email.body,
        status=saved_email.status,
        created_at=saved_email.created_at,
    )
