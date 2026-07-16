import os
import json
from pathlib import Path
from typing import Dict, Any
from sentence_transformers import SentenceTransformer

# Load model name from environment configuration
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
model = SentenceTransformer(EMBEDDING_MODEL_NAME)

class EmbeddingService:
    @staticmethod
    def generate_embeddings(document_id: str) -> Dict[str, Any]:
        """
        Reads the chunked document JSON, generates embedding vectors for
        every chunk using the configured model, and saves the result locally.
        """
        chunks_path = Path(__file__).parent.parent / "uploads" / "chunks" / f"{document_id}.json"
        
        if not chunks_path.exists():
            raise FileNotFoundError(f"Chunked text file not found for document ID {document_id}")
            
        with open(chunks_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)
            
        for idx, chunk in enumerate(chunks):
            text = chunk.get("text", "")
            # Generate the embedding vector
            embedding_vector = model.encode(text).tolist()
            chunk["embedding"] = embedding_vector
            
        # Save output JSON
        embeddings_dir = Path(__file__).parent.parent / "uploads" / "embeddings"
        embeddings_dir.mkdir(parents=True, exist_ok=True)
        
        output_path = embeddings_dir / f"{document_id}.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)
            
        return {
            "totalChunks": len(chunks),
            "embeddingDimension": 384,
            "outputPath": str(output_path)
        }
