import json
import google.generativeai as genai
from typing import Dict
from fastapi import HTTPException, status
from app.core.config import settings

class AIService:
    """
    Service for integrating with Google Gemini AI.
    """
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key and self.api_key != "FAKE_GEMINI_KEY":
            genai.configure(api_key=self.api_key)
            # Use gemini-1.5-flash as default for fast generation tasks
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None

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
        if not self.model:
            # If the AI model is not configured (missing API key), return a mock response for testing
            return {"subject": "Mock Subject", "body": "This is a mock email body generated for testing purposes."}
            
        system_instructions = (
            "You are an expert email copywriter. Generate a highly professional email based on the prompt. "
            "You MUST respond ONLY with a valid JSON object containing exactly two keys: 'subject' and 'body'. "
            "Do not include markdown formatting like ```json or any other text outside the JSON object."
        )
        
        full_prompt = f"{system_instructions}\n\nPrompt: {prompt}"
        
        try:
            # We use generate_content_async for async execution
            response = await self.model.generate_content_async(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            
            response_text = response.text
            
            # Parse the JSON response
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

ai_service = AIService()
