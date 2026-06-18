import json
import re
from typing import Dict, Optional
from fastapi import HTTPException, status
from app.core.config import settings

class AIService:
    """
    Service for integrating with Google Gemini AI.
    """
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        if self.api_key and self.api_key != "FAKE_GEMINI_KEY":
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception:
                self.client = None

    async def generate_email(self, prompt: str) -> Dict[str, str]:
        """
        Generate an email subject and body using Gemini based on a user prompt.

        Args:
            prompt (str): The instructions for the email generation.

        Returns:
            Dict[str, str]: A dictionary containing 'subject' and 'body'.

        Raises:
            HTTPException: If API key is missing or generation fails.
        """
        if not self.client:
            # If the AI model is not configured (missing API key), return a mock response
            return {"subject": "Mock Subject", "body": "This is a mock email body generated for testing purposes."}

        system_instructions = (
            "You are an expert email copywriter. Generate a highly professional email based on the prompt. "
            "You MUST respond ONLY with a valid JSON object containing exactly two keys: 'subject' and 'body'. "
            "Do not include markdown formatting like ```json or any other text outside the JSON object."
        )

        full_prompt = f"{system_instructions}\n\nPrompt: {prompt}"

        try:
            from google import genai
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=full_prompt,
            )

            response_text = response.text

            # Strip markdown code fences if present
            if response_text.strip().startswith("```"):
                response_text = response_text.strip().strip("```").strip()
                if response_text.startswith("json"):
                    response_text = response_text[4:].strip()

            email_data = json.loads(response_text)

            if "subject" not in email_data or "body" not in email_data:
                raise ValueError("Response missing required keys")

            return {
                "subject": email_data["subject"],
                "body": email_data["body"]
            }

        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to parse AI response as JSON"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI generation failed: {str(e)}"
            )

    async def translate_text(
        self,
        text: str,
        source_lang: str = "auto",
        target_lang: str = "en",
    ) -> Dict[str, Optional[str]]:
        """
        Translate text using Gemini AI.

        Args:
            text (str): The text to translate.
            source_lang (str): Source language code, or 'auto' for detection.
            target_lang (str): Target language code.

        Returns:
            Dict with 'translated_text' and optional 'detected_language'.
        """
        if not self.client:
            # Mock response when AI is not configured
            return {
                "translated_text": f"[Mock translation of: {text[:50]}]",
                "detected_language": "en",
            }

        if source_lang == "auto":
            source_instruction = (
                "The source language is unknown — detect it automatically and include "
                "the detected ISO-639-1 language code in the 'detected_language' field."
            )
        else:
            source_instruction = (
                f"The source language is '{source_lang}'. "
                "Set 'detected_language' to null."
            )

        system_instructions = (
            "You are an expert, fluent translator. Translate the given text accurately and naturally. "
            f"{source_instruction} "
            f"Translate into language code '{target_lang}'. "
            "You MUST respond ONLY with a valid JSON object containing exactly two keys: "
            "'translated_text' (the translation) and 'detected_language' (ISO-639-1 code or null). "
            "Do not include markdown formatting or any text outside the JSON object."
        )

        full_prompt = f"{system_instructions}\n\nText to translate:\n{text}"

        try:
            from google import genai
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=full_prompt,
            )

            response_text = response.text.strip()

            # Strip markdown code fences if present
            if response_text.startswith("```"):
                response_text = re.sub(r"^```[a-z]*\n?", "", response_text)
                response_text = re.sub(r"```$", "", response_text).strip()

            data = json.loads(response_text)

            if "translated_text" not in data:
                raise ValueError("Response missing 'translated_text' key")

            return {
                "translated_text": data["translated_text"],
                "detected_language": data.get("detected_language"),
            }

        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to parse AI translation response as JSON",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI translation failed: {str(e)}",
            )

ai_service = AIService()
