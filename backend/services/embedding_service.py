import os
import json
from pathlib import Path
from typing import Dict, Any
from google import genai

# Reuse API key from environment
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("Startup Error: GEMINI_API_KEY environment variable is missing.")

client = genai.Client(api_key=api_key)

class EmbeddingService:
    @staticmethod
    def generate_embeddings(document_id: str) -> Dict[str, Any]:
        """
        Reads the chunked document JSON, generates embedding vectors for
        every chunk using the Gemini Embeddings API (text-embedding-004),
        and saves the result locally.
        """
        chunks_path = Path(__file__).parent.parent / "uploads" / "chunks" / f"{document_id}.json"
        
        if not chunks_path.exists():
            raise FileNotFoundError(f"Chunked text file not found for document ID {document_id}")
            
        with open(chunks_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)
            
        if not chunks:
            return {
                "totalChunks": 0,
                "embeddingDimension": 0,
                "outputPath": ""
            }

        # Extract all chunk texts
        texts = [chunk.get("text", "") for chunk in chunks]
        
        # Call Gemini Embeddings API in a single batch request
        response = client.models.embed_content(
            model="models/gemini-embedding-2",
            contents=texts
        )
        
        embeddings = response.embeddings
        dim = 0
        
        for idx, chunk in enumerate(chunks):
            embedding_vector = embeddings[idx].values
            chunk["embedding"] = embedding_vector
            if idx == 0:
                dim = len(embedding_vector)
            
        # Save output JSON
        embeddings_dir = Path(__file__).parent.parent / "uploads" / "embeddings"
        embeddings_dir.mkdir(parents=True, exist_ok=True)
        
        output_path = embeddings_dir / f"{document_id}.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)
            
        return {
            "totalChunks": len(chunks),
            "embeddingDimension": dim,
            "outputPath": str(output_path)
        }
