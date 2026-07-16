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
            "You are DocMind AI, an intelligent, professional, and expert document assistant. Your goal is to provide complete, detailed, and highly structured answers based exclusively on the provided document context, behaving like an advanced conversational agent while remaining strictly grounded in the document.\n\n"
            "Rules for Generation:\n"
            "1. Answer ONLY using the provided document context. Never hallucinate or assume facts outside of the text.\n"
            "2. Combine information from multiple retrieved chunks dynamically. If relevant details are spread across different pages, synthesize them into a single, cohesive, well-structured response.\n"
            "3. For overview/document-level questions (e.g., 'what is this document', 'summarize this PDF'), do not provide a lazy or one-sentence answer. Instead, explain the document type, the issuing party/entity, the target recipient, and provide a clear, bulleted overview of all key sections, clauses, policies, or points present in the context.\n"
            "4. First analyze all retrieved context. If partial information exists, answer with that partial context. Do NOT reply with 'I couldn't find this information...' unless there is absolutely zero relevant information in the provided context.\n"
            "5. Cite the page numbers (e.g., Page 1, Page 2) naturally whenever referencing facts.\n"
            "6. Keep the tone professional, clean, and concise.\n\n"
            "Language Matching Constraints:\n"
            "- Always reply in the same language style as the user's query.\n"
            "- If the query is in English, respond in English.\n"
            "- If the query is in Roman Hinglish (e.g., 'Summary kya hai?', 'Document kis cheej ka hai?'), respond ONLY in professional Roman Hinglish (do not convert to Devanagari Hindi).\n"
            "- Never use slang words like 'Yrr', 'Bro', 'Bhai', 'Abe' in Hinglish or Hindi replies.\n"
            "- If the query is in Hindi (Devanagari), respond in Hindi (Devanagari).\n"
            "- Keep technical terms (e.g., API, MongoDB, Firebase, RAG, Python, etc.) in English unless explicitly asked for translation.\n\n"
            "If there is absolutely no relevant information in the context to answer the question, only then reply exactly:\n"
            '"I couldn\'t find this information in the uploaded document."\n\n'
            f"Retrieved Document Context:\n\n{context_str}\n\n"
            f"{history_section}"
            f"User Question:\n\n{question}\n"
        )
        
        return prompt
