import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF

# Configure logger
logger = logging.getLogger("docmind_ai")

class PDFService:
    @staticmethod
    def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> Optional[List[Dict[str, Any]]]:
        """
        Extracts text from PDF bytes page by page.
        Returns a list of dictionaries with 'page' and 'text'.
        If no text can be extracted from the entire document, returns None.
        """
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            pages_data = []
            total_text_length = 0
            
            for page_num, page in enumerate(doc):
                text = page.get_text()
                total_text_length += len(text.strip())
                pages_data.append({
                    "page": page_num + 1,
                    "text": text
                })
                
            # If cumulative text length is 0, it means it's likely scanned or empty
            if total_text_length == 0:
                return None
                
            return pages_data
        except Exception as e:
            logger.error(f"Error during PDF text extraction: {e}", exc_info=True)
            return None

    @staticmethod
    def save_extracted_text(document_id: str, pages_data: List[Dict[str, Any]]) -> str:
        """
        Saves the extracted pages data as a JSON file locally.
        Path: backend/uploads/processed/{documentId}.json
        """
        processed_dir = Path(__file__).parent.parent / "uploads" / "processed"
        processed_dir.mkdir(parents=True, exist_ok=True)
        
        output_path = processed_dir / f"{document_id}.json"
        
        document_json = {
            "documentId": document_id,
            "totalPages": len(pages_data),
            "pages": pages_data
        }
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(document_json, f, ensure_ascii=False, indent=2)
            
        return str(output_path)
