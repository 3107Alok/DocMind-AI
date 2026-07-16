import os
import logging
from typing import Dict, Any
from groq import Groq

# Configure logger
logger = logging.getLogger("docmind_ai")

class GroqService:
    @staticmethod
    def generate_response(prompt: str) -> Dict[str, Any]:
        """
        Sends the structured prompt to the Groq API.
        """
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("Groq API configuration error: GROQ_API_KEY is missing.")
            
        model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        try:
            logger.info(f"Using model {model_name} on Groq for generation request")
            client = Groq(api_key=api_key)
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2
            )
            
            answer = response.choices[0].message.content
            if answer:
                return {
                    "success": True,
                    "answer": answer
                }
            else:
                raise ValueError("Empty response received from Groq API.")
        except Exception as e:
            logger.error(f"Groq generation call failed: {e}")
            raise e
