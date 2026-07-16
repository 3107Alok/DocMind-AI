import json
import logging
from pathlib import Path
from typing import Dict, Any
import chromadb

# Configure logger
logger = logging.getLogger("docmind_ai")

# Initialize the ChromaDB client once when the service starts
db_path = Path(__file__).parent.parent / "chroma_db"
db_path.mkdir(parents=True, exist_ok=True)

client = chromadb.PersistentClient(path=str(db_path))
collection = client.get_or_create_collection(name="documents")

# Updated for Gemini text-embedding-004 compatibility
class VectorDBService:
    @staticmethod
    def index_document(document_id: str, user_id: str, file_name: str) -> Dict[str, Any]:
        """
        Loads the generated embeddings JSON and indexes the chunks inside ChromaDB.
        Avoids duplicate entries by querying chunkId first.
        """
        embeddings_path = Path(__file__).parent.parent / "uploads" / "embeddings" / f"{document_id}.json"
        
        if not embeddings_path.exists():
            raise FileNotFoundError(f"Embeddings file not found for document ID {document_id}")
            
        with open(embeddings_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)
            
        indexed_count = 0
        
        for idx, chunk in enumerate(chunks):
            chunk_id = chunk.get("chunkId", "")
            
            # Check duplication: query ChromaDB by ID
            existing = collection.get(ids=[chunk_id])
            if existing and existing.get("ids"):
                continue
                
            collection.add(
                ids=[chunk_id],
                embeddings=[chunk["embedding"]],
                documents=[chunk["text"]],
                metadatas=[{
                    "documentId": document_id,
                    "chunkId": chunk_id,
                    "chunkIndex": chunk["chunkIndex"],
                    "pageStart": chunk["pageStart"],
                    "pageEnd": chunk["pageEnd"],
                    "userId": user_id,
                    "fileName": file_name
                }]
            )
            indexed_count += 1
            
        return {
            "totalChunks": len(chunks),
            "indexedChunks": indexed_count,
            "collection": "documents"
        }

    @staticmethod
    def get_indexing_status(document_id: str) -> Dict[str, Any]:
        """
        Queries ChromaDB to see how many chunks are currently indexed for the document.
        """
        try:
            results = collection.get(
                where={"documentId": document_id}
            )
            ids = results.get("ids", [])
            return {
                "success": True,
                "indexedChunks": len(ids),
                "collection": "documents"
            }
        except Exception as e:
            logger.error(f"Get vector status failed: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Unable to fetch indexing status: {str(e)}"
            }

    @staticmethod
    def delete_document_vectors(document_id: str) -> bool:
        """
        Deletes all vector chunks belonging to the document from ChromaDB.
        """
        try:
            collection.delete(
                where={"documentId": document_id}
            )
            return True
        except Exception as e:
            logger.error(f"Delete document vectors failed: {e}", exc_info=True)
            return False
