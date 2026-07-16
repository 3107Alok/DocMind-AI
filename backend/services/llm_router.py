import os
import logging
from typing import Dict, Any

from services.groq_service import GroqService
from services.gemini_service import GeminiService

logger = logging.getLogger("docmind_ai")

class LLMRouter:
    @staticmethod
    def generate_response(prompt: str) -> Dict[str, Any]:
        """
        Routes the LLM prompt to the primary provider (defaulting to Groq),
        and falls back to Gemini if the primary provider experiences transient errors.
        """
        primary = os.getenv("PRIMARY_LLM", "groq").lower().strip()
        fallback = os.getenv("FALLBACK_LLM", "gemini").lower().strip()

        # Define call helper map
        providers = {
            "groq": GroqService.generate_response,
            "gemini": GeminiService.generate_response
        }

        if primary not in providers:
            logger.warning(f"Unknown primary LLM '{primary}', defaulting to groq")
            primary = "groq"

        primary_name = "Groq" if primary == "groq" else "Gemini"
        fallback_name = "Gemini" if primary == "groq" else "Groq"

        logger.info(f"Trying {primary_name}...")
        
        try:
            res = providers[primary](prompt)
            if res.get("success"):
                logger.info(f"{primary_name} Success")
                logger.info(f"Provider Used: {primary_name}")
                return res
            else:
                # If service returned failure response dictionary, propagate as transient failure
                raise RuntimeError(res.get("message", "Service returned failure result"))
        except Exception as e:
            err_msg = str(e)
            
            # Identify if it is a configuration mistake
            is_config_error = False
            if "API key" in err_msg or "unauthorized" in err_msg.lower() or "401" in err_msg or "authentication" in err_msg.lower():
                is_config_error = True
            
            if is_config_error:
                logger.error(f"{primary_name} configuration error occurred. No fallback will be attempted. Error: {err_msg}")
                return {
                    "success": False,
                    "message": f"{primary_name} service configuration error: {err_msg}"
                }

            # Otherwise attempt fallback
            logger.warning(f"{primary_name} failed")
            logger.info(f"Switching to {fallback_name}")
            
            try:
                fallback_res = providers[fallback](prompt)
                if fallback_res.get("success"):
                    logger.info(f"{fallback_name} Success")
                    logger.info(f"Provider Used: {fallback_name} Fallback")
                return fallback_res
            except Exception as fallback_e:
                logger.error(f"Fallback {fallback_name} also failed: {fallback_e}", exc_info=True)
                return {
                    "success": False,
                    "message": "LLM services are currently busy. Please try again in a few moments."
                }
