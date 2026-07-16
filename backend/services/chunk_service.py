import re
import json
from pathlib import Path
from typing import List, Dict, Any

class ChunkService:
    @staticmethod
    def chunk_document(document_id: str) -> Dict[str, Any]:
        """
        Reads the extracted text JSON file of the document,
        chunks it semantically (500-700 words, 100 words overlap),
        saves the chunks locally, and returns metadata.
        """
        processed_path = Path(__file__).parent.parent / "uploads" / "processed" / f"{document_id}.json"
        
        if not processed_path.exists():
            raise FileNotFoundError(f"Processed text file not found for document ID {document_id}")
            
        with open(processed_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        pages = data.get("pages", [])
        
        # 1. Extract sentences with page mappings
        all_sentences = []
        total_words = 0
        
        for p in pages:
            page_num = p["page"]
            text = p["text"]
            # Split page by paragraph boundaries
            paragraphs = text.split("\n\n")
            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue
                # Simple sentence splitter that doesn't cut mid-sentence
                sentences = re.split(r'(?<=[.!?])\s+', para)
                for s in sentences:
                    s = s.strip()
                    if not s:
                        continue
                    word_count = len(s.split())
                    total_words += word_count
                    all_sentences.append({
                        "text": s,
                        "page": page_num,
                        "word_count": word_count
                    })
                    
        # 2. Handle very small documents (< 500 words)
        if total_words < 500:
            chunk_text = " ".join([s["text"] for s in all_sentences])
            page_start = all_sentences[0]["page"] if all_sentences else 1
            page_end = all_sentences[-1]["page"] if all_sentences else 1
            
            chunks = [{
                "chunkId": f"{document_id}-chunk-1",
                "documentId": document_id,
                "pageStart": page_start,
                "pageEnd": page_end,
                "text": chunk_text,
                "wordCount": total_words,
                "chunkIndex": 0
            }]
            
            ChunkService._save_chunks(document_id, chunks)
            return {
                "totalChunks": 1,
                "averageChunkSize": total_words,
                "totalWords": total_words
            }
            
        # 3. Chunking loop
        chunks = []
        i = 0
        chunk_index = 1
        previous_i = -1
        
        while i < len(all_sentences):
            if i <= previous_i:
                raise RuntimeError(
                    f"Chunking cursor did not advance. previous={previous_i}, current={i}"
                )
            previous_i = i
            start_i = i
            current_chunk_sentences = []
            current_word_count = 0
            page_start = all_sentences[i]["page"]
            
            # Add sentences to current chunk
            while i < len(all_sentences):
                sentence = all_sentences[i]
                
                # Check constraints: split chunk if it exceeds 700 words
                if current_word_count + sentence["word_count"] > 700 and current_word_count >= 500:
                    break
                    
                current_chunk_sentences.append(sentence)
                current_word_count += sentence["word_count"]
                i += 1
                
                # Soft check: if we exceed target 600 words, close chunk
                if current_word_count >= 600:
                    break
                    
            if not current_chunk_sentences:
                break
                
            page_end = current_chunk_sentences[-1]["page"]
            chunk_text = " ".join([s["text"] for s in current_chunk_sentences])
            
            chunks.append({
                "chunkId": f"{document_id}-chunk-{chunk_index}",
                "documentId": document_id,
                "pageStart": page_start,
                "pageEnd": page_end,
                "text": chunk_text,
                "wordCount": current_word_count,
                "chunkIndex": chunk_index - 1
            })
            
            chunk_index += 1
            
            # 4. Overlap backtracker (~100 words)
            if i < len(all_sentences):
                overlap_words = 0
                overlap_index = i - 1
                while overlap_index >= 0 and overlap_words < 100:
                    overlap_words += all_sentences[overlap_index]["word_count"]
                    overlap_index -= 1
                # Point parser cursor to index following the overlap threshold (guaranteed to advance)
                i = max(start_i + 1, overlap_index + 1)
                
        # 5. Save chunks locally
        ChunkService._save_chunks(document_id, chunks)
        
        avg_size = sum([c["wordCount"] for c in chunks]) // len(chunks) if chunks else 0
        return {
            "totalChunks": len(chunks),
            "averageChunkSize": avg_size,
            "totalWords": total_words
        }

    @staticmethod
    def _save_chunks(document_id: str, chunks: List[Dict[str, Any]]):
        """
        Saves the chunk dictionary array to backend/uploads/chunks/{documentId}.json
        """
        chunks_dir = Path(__file__).parent.parent / "uploads" / "chunks"
        chunks_dir.mkdir(parents=True, exist_ok=True)
        
        output_path = chunks_dir / f"{document_id}.json"
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)
