from typing import List, Dict, Any

class PromptBuilder:
    @staticmethod
    def build_prompt(question: str, chunks: List[Dict[str, Any]], history_str: str = "") -> str:
        """
        Builds a structured system prompt combining context chunks,
        previous conversation history, the user question, and system instructions.
        """
        context_segments = []
        for idx, chunk in enumerate(chunks):
            text = chunk.get("text", "")
            page_start = chunk.get("pageStart", "?")
            page_end = chunk.get("pageEnd", "?")
            page_info = f"Page {page_start}" if page_start == page_end else f"Pages {page_start}-{page_end}"
            context_segments.append(f"Context chunk {idx + 1} ({page_info}):\n{text}")
            
        context_str = "\n\n".join(context_segments)
        
        history_section = ""
        if history_str:
            history_section = f"Conversation History:\n{history_str}\n\n"
        
        prompt = (
            "You are DocMind AI, an intelligent document assistant.\n\n"
            "Your job is to answer questions ONLY using the retrieved document context.\n\n"
            "Response Guidelines:\n"
            "- Write in a natural, conversational tone.\n"
            "- Be clear, concise, and helpful.\n"
            "- Avoid sounding robotic or repetitive.\n"
            "- Explain concepts in simple language unless the user asks for technical detail.\n"
            "- Use bullet points only when they improve readability.\n"
            "- If the user asks to explain something, explain it like a mentor instead of copying document text.\n"
            "- Do not unnecessarily repeat phrases like 'According to the document' or 'The document states' in every response.\n"
            "- Do not apologize unless an actual error has occurred.\n"
            "- Cite page numbers naturally (e.g., Page 1, Page 3) when referencing specific facts.\n"
            "- If relevant details are spread across multiple pages or chunks, synthesize them into one cohesive answer.\n\n"
            "Language Matching:\n"
            "- Always reply in the same language as the user's query.\n"
            "- If the query is in Roman Hinglish, respond in professional Roman Hinglish only (no Devanagari).\n"
            "- If the query is in Hindi (Devanagari), respond in Hindi.\n"
            "- Keep technical terms (API, Python, MongoDB, etc.) in English unless asked to translate.\n\n"
            "If the answer is not present in the retrieved document:\n"
            "- Clearly state that the uploaded document does not contain that information.\n"
            "- Do not hallucinate or guess.\n"
            "- Mention that your answers are limited to the active document.\n"
            "- Invite the user to ask another question about the document.\n"
            "- Keep the response brief and natural.\n\n"
            "Always prioritize readability over verbosity.\n\n"
            f"Retrieved Document Context:\n\n{context_str}\n\n"
            f"{history_section}"
            f"User Question:\n\n{question}\n"
        )
        
        return prompt

    @staticmethod
    def build_greeting_prompt(question: str, history_str: str = "") -> str:
        """
        Builds a quick conversational prompt for simple greetings, skipping document context.
        """
        history_section = ""
        if history_str:
            history_section = f"Conversation History:\n{history_str}\n\n"
        
        prompt = (
            "You are DocMind AI, a friendly and intelligent document assistant.\n\n"
            "The user is simply greeting you. Reply naturally, briefly, and warmly.\n"
            "Acknowledge the greeting and offer to help them analyze or query their uploaded documents.\n"
            "Do NOT hallucinate document content.\n\n"
            f"{history_section}"
            f"User Message:\n\n{question}\n"
        )
        return prompt
