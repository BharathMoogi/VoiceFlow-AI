"""
Translate API endpoint.

POST /translate/text
    - Accepts { text, source_lang, target_lang }
    - Translates text using Gemini AI
    - Returns { translated_text, detected_language }
    - Requires JWT authentication
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api import deps
from app.models.user import User
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to translate")
    source_lang: str = Field(default="auto", description="Source language code or 'auto' for detection")
    target_lang: str = Field(..., description="Target language code (e.g. 'es', 'fr', 'de')")


class TranslateResponse(BaseModel):
    translated_text: str
    detected_language: Optional[str] = None
    source_lang: str
    target_lang: str


# ---------------------------------------------------------------------------
# POST /translate/text
# ---------------------------------------------------------------------------

@router.post(
    "/text",
    response_model=TranslateResponse,
    summary="Translate text using Gemini AI",
    description=(
        "Translate text from a source language to a target language using Gemini AI. "
        "Set source_lang to 'auto' for automatic language detection. "
        "Requires a valid JWT bearer token."
    ),
)
async def translate_text(
    request: TranslateRequest,
    current_user: User = Depends(deps.get_current_active_user),
) -> TranslateResponse:
    """
    Translate text using Gemini AI.

    - **text**: The text to translate (max 5000 characters)
    - **source_lang**: Source language code or 'auto' for auto-detection
    - **target_lang**: Target language code

    Returns:
        `{ "translated_text": "...", "detected_language": "en", "source_lang": "auto", "target_lang": "es" }`
    """
    logger.info(
        "User %s: translating text (%d chars) from '%s' to '%s'",
        current_user.id,
        len(request.text),
        request.source_lang,
        request.target_lang,
    )

    try:
        result = await ai_service.translate_text(
            text=request.text,
            source_lang=request.source_lang,
            target_lang=request.target_lang,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Unexpected translation error for user %s: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during translation.",
        ) from exc

    logger.info(
        "User %s: translation complete, detected_language='%s'",
        current_user.id,
        result.get("detected_language"),
    )

    return TranslateResponse(
        translated_text=result["translated_text"],
        detected_language=result.get("detected_language"),
        source_lang=request.source_lang,
        target_lang=request.target_lang,
    )
