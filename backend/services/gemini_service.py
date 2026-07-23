import os
import time
import logging
from typing import Dict, Any
from google import genai

# Configure logger
logger = logging.getLogger("docmind_ai")

# Load and validate GEMINI_API_KEY on startup
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise ValueError("Startup Error: GEMINI_API_KEY environment variable is missing.")

# Initialize the new SDK Client singleton
client = genai.Client(api_key=gemini_api_key)

class GeminiService:
    @staticmethod
    def generate_response(prompt: str) -> Dict[str, Any]:
        """
        Sends the structured prompt to the Gemini API with a streamlined model fallback
        and a maximum of 3 total API calls.
        
        Flow:
        1. Try gemini-2.5-flash (Attempt 1)
        2. If transient error (429/503/500), wait 2s and retry ONCE (Attempt 2)
        3. If still fails, try gemini-2.0-flash ONCE (Attempt 3)
        4. If still fails, return clean error response.
        """
        last_error = ""
        
        # --- Attempt 1: Try gemini-2.5-flash ---
        model_primary = "gemini-2.5-flash"
        try:
            logger.info(f"Using model {model_primary} for generation request (Attempt 1)")
            response = client.models.generate_content(
                model=model_primary,
                contents=prompt
            )
            if response and response.text:
                return {
                    "success": True,
                    "answer": response.text
                }
            else:
                raise ValueError("Empty response received from Gemini API.")
        except Exception as e:
            err_msg = str(e)
            last_error = err_msg
            
            # Check if the error is transient (429/503/500)
            is_transient = False
            if "503" in err_msg or "UNAVAILABLE" in err_msg.upper():
                is_transient = True
            elif "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg.upper():
                is_transient = True
            elif "500" in err_msg or "INTERNAL" in err_msg.upper():
                is_transient = True
            
            # --- Attempt 2: If transient, wait 2s and retry ONCE on gemini-2.5-flash ---
            if is_transient:
                try:
                    logger.warning(f"Transient error on {model_primary}: {err_msg}. Retrying once in 2 seconds...")
                    time.sleep(2)
                    logger.info(f"Using model {model_primary} for generation request (Attempt 2)")
                    response = client.models.generate_content(
                        model=model_primary,
                        contents=prompt
                    )
                    if response and response.text:
                        return {
                            "success": True,
                            "answer": response.text
                        }
                    else:
                        raise ValueError("Empty response received from Gemini API.")
                except Exception as retry_e:
                    err_msg = str(retry_e)
                    last_error = err_msg
            
        # --- Attempt 3: Try gemini-2.0-flash ONCE ---
        model_fallback = "gemini-2.0-flash"
        try:
            logger.warning(f"Primary model {model_primary} failed. Falling back to {model_fallback}...")
            logger.info(f"Using model {model_fallback} for generation request (Attempt 3)")
            response = client.models.generate_content(
                model=model_fallback,
                contents=prompt
            )
            if response and response.text:
                return {
                    "success": True,
                    "answer": response.text
                }
            else:
                raise ValueError("Empty response received from Gemini API.")
        except Exception as fallback_e:
            err_msg = str(fallback_e)
            last_error = err_msg
            
        # All attempts failed
        logger.error(f"All Gemini models failed. Last error: {last_error}", exc_info=True)
        return {
            "success": False,
            "message": "Gemini servers are currently busy.\nPlease try again in a few moments."
        }

    @staticmethod
    def generate_response_stream(prompt: str):
        """
        Sends the structured prompt to the Gemini API and yields chunks as they arrive.
        """
        model_primary = "gemini-2.5-flash"
        try:
            logger.info(f"Using model {model_primary} for streaming request")
            response = client.models.generate_content_stream(
                model=model_primary,
                contents=prompt
            )
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logger.error(f"Gemini streaming call failed: {e}", exc_info=True)
            raise e
