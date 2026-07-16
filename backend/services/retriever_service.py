from typing import List, Dict, Any, Optional
from services.embedding_service import model
from services.vector_db_service import collection

class RetrieverService:
    @staticmethod
    def retrieve_chunks(document_id: str, user_question: str) -> List[Dict[str, Any]]:
        """
        Embeds the user question and queries ChromaDB for relevant chunks.
        Dynamically adjusts the number of retrieved chunks based on whether the
        user is asking a document-level broad question or a specific fact query.
        """
        # Determine query type based on key phrases
        broad_keywords = [
            "what is", "summary", "summarize", "overview", "explain", 
            "about", "main points", "policies", "policy", "terms", 
            "contain", "content", "document", "kis chiz", "kis cheej"
        ]
        
        is_broad = False
        question_lower = user_question.lower()
        for kw in broad_keywords:
            if kw in question_lower:
                is_broad = True
                break
                
        # Higher top_k (12) for broad queries, lower top_k (5) for specific queries
        n_results = 12 if is_broad else 5
        
        query_vector = model.encode(user_question).tolist()
        
        results = collection.query(
            query_embeddings=[query_vector],
            n_results=n_results,
            where={"documentId": document_id}
        )
        
        if not results or not results.get("ids") or not results["ids"][0]:
            return []
            
        retrieved_chunks = []
        ids = results["ids"][0]
        distances = results["distances"][0] if results.get("distances") else [0.0] * len(ids)
        metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(ids)
        documents = results["documents"][0] if results.get("documents") else [""] * len(ids)
        
        for idx in range(len(ids)):
            distance = distances[idx]
            # Simple L2 distance to similarity metric converter
            similarity_score = 1.0 / (1.0 + distance)
            
            metadata = metadatas[idx]
            text = documents[idx]
            chunk_id = ids[idx]
            
            retrieved_chunks.append({
                "chunkId": chunk_id,
                "text": text,
                "pageStart": metadata.get("pageStart"),
                "pageEnd": metadata.get("pageEnd"),
                "similarityScore": round(similarity_score, 4)
            })
            
        # Sort results by similarity score (highest first)
        retrieved_chunks.sort(key=lambda x: x["similarityScore"], reverse=True)
        
        return retrieved_chunks
