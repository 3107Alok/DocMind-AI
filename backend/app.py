import os
import sys
import uuid
import io
from pathlib import Path
from dotenv import load_dotenv

# Reconfigure stdout/stderr to UTF-8 to prevent UnicodeEncodeError on Windows terminals
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Configure standard logger
import logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("docmind_ai")

# 1. Verify backend/.env exists and load environment variables before doing any operation
BASE_DIR = Path(__file__).resolve().parent
backend_dir = BASE_DIR

load_dotenv(
    dotenv_path=BASE_DIR / ".env",
    override=True
)

# Initialize audit trackers
startup_failed = False
fail_reason = ""
mongo_uri_loaded = False
mongo_connected = False
gridfs_initialized = False
db_selected = False
upload_ready = False

# Validate MONGO_URI
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise ValueError("Startup Error: MONGO_URI environment variable is missing.")
mongo_uri_loaded = True

# Validate GEMINI_API_KEY
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise ValueError("Startup Error: GEMINI_API_KEY environment variable is missing.")

# Check MongoDB & GridFS
import pymongo
import gridfs
from bson import ObjectId

try:
    # Add a short timeout so startup fails fast if connection cannot be established
    mongo_client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    
    # Ping the database on startup
    mongo_client.admin.command("ping")
    mongo_connected = True
    
    mongo_db_name = os.getenv("MONGO_DB_NAME", "docmind_ai")
    mongo_db = mongo_client[mongo_db_name]
    db_selected = True
    
    fs = gridfs.GridFS(mongo_db)
    gridfs_initialized = True
    upload_ready = True
except Exception as e:
    startup_failed = True
    fail_reason = f"MongoDB connection or GridFS initialization failed: {e}"

# Check Firebase Admin & Firestore
firebase_connected = False
firestore_ready = False
import firebase_admin
from firebase_admin import credentials, firestore, auth
from google.cloud.firestore import FieldFilter

try:
    cred = None
    cred_file = BASE_DIR / "firebase_service_account.json"
    
    # 1. Try loading from local file
    if cred_file.exists():
        cred = credentials.Certificate(str(cred_file))
    else:
        # 2. Fallback: Load from environment variable (ideal for Render/deployments)
        service_account_env = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        if service_account_env:
            import json
            try:
                cred_data = json.loads(service_account_env)
                cred = credentials.Certificate(cred_data)
            except Exception as json_err:
                if Path(service_account_env).exists():
                    cred = credentials.Certificate(service_account_env)
                else:
                    raise ValueError(f"FIREBASE_SERVICE_ACCOUNT environment variable is not a valid JSON string or file path: {json_err}")
        else:
            raise FileNotFoundError(
                f"Startup Error: Firebase Service Account credentials missing. "
                f"Add {cred_file} or set FIREBASE_SERVICE_ACCOUNT env var."
            )

    # Initialize app if not already initialized
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)

    # Verify firestore client can be initialized
    db = firestore.client()
    firebase_connected = True
    firestore_ready = True
except Exception as e:
    startup_failed = True
    fail_reason = f"Firebase Admin or Firestore initialization failed: {e}"

# Check ChromaDB
chromadb_ready = False
import chromadb
try:
    chroma_path = backend_dir / "chroma_db"
    chroma_path.mkdir(parents=True, exist_ok=True)
    chroma_client = chromadb.PersistentClient(path=str(chroma_path))
    collection = chroma_client.get_or_create_collection("documents")
    chromadb_ready = True
except Exception as e:
    startup_failed = True
    fail_reason = f"ChromaDB initialization failed: {e}"

# Check Embedding Model (Gemini Embeddings)
embedding_loaded = False
try:
    from google import genai
    test_client = genai.Client(api_key=gemini_api_key)
    embedding_loaded = True
except Exception as e:
    startup_failed = True
    fail_reason = f"Gemini Embedding configuration failed: {e}"

# Check Gemini Config
gemini_ready = False
from google import genai
try:
    client = genai.Client(api_key=gemini_api_key)
    gemini_ready = True
except Exception as e:
    startup_failed = True
    fail_reason = f"Gemini API configuration failed: {e}"

# Check Upload, Processed, Chunk, and Embedding folders
upload_folder_ready = False
processed_folder_ready = False
chunk_folder_ready = False
embedding_folder_ready = False

try:
    (backend_dir / "uploads").mkdir(parents=True, exist_ok=True)
    upload_folder_ready = True
    
    (backend_dir / "uploads" / "processed").mkdir(parents=True, exist_ok=True)
    processed_folder_ready = True
    
    (backend_dir / "uploads" / "chunks").mkdir(parents=True, exist_ok=True)
    chunk_folder_ready = True
    
    (backend_dir / "uploads" / "embeddings").mkdir(parents=True, exist_ok=True)
    embedding_folder_ready = True
except Exception as e:
    startup_failed = True
    fail_reason = f"Upload folders directories initialization failed: {e}"

# Fail startup if any dependency or connection checks failed
if startup_failed:
    print("✗ Missing Configuration")
    sys.exit(f"Startup Error: Audit check failed. Reason: {fail_reason}")

# Print startup health report in exact format requested
print("========================================")
print("DocMind AI Startup Audit")
print("========================================")
print("✓ MongoDB Connected" if mongo_connected else "✗ MongoDB Connection Failed")
print("✓ GridFS Ready" if gridfs_initialized else "✗ GridFS Initialization Failed")
print("✓ Firebase Connected" if firebase_connected else "✗ Firebase Connection Failed")
print("✓ Firestore Ready" if firestore_ready else "✗ Firestore Initialization Failed")
print("✓ ChromaDB Ready" if chromadb_ready else "✗ ChromaDB Initialization Failed")
print("✓ Embedding Model Loaded" if embedding_loaded else "✗ Embedding Model Load Failed")
print("✓ Gemini Configured" if gemini_ready else "✗ Gemini Configuration Failed")
print("✓ Upload Folder Ready" if upload_folder_ready else "✗ Upload Folder Missing")
print("\nSystem Status : HEALTHY")
print("========================================\n")

# Start FastAPI App Setup
import json
import datetime
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, status, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

app = FastAPI(title="DocMind AI Backend")

# Enable CORS for the frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://doc-mind-ai-alpha.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Dependency
security = HTTPBearer()

def get_current_user(authorization: HTTPAuthorizationCredentials = Depends(security)):
    token = authorization.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_418_IM_A_TEAPOT if "expired" in str(e) else status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
        )

from services.pdf_service import PDFService
from services.chunk_service import ChunkService
from services.embedding_service import EmbeddingService
from services.vector_db_service import VectorDBService
from services.retriever_service import RetrieverService
from services.prompt_builder import PromptBuilder
from services.gemini_service import GeminiService

class RetrievalRequest(BaseModel):
    documentId: str
    question: str

class QueryRequest(BaseModel):
    documentId: str
    question: str

class ChatRequest(BaseModel):
    documentId: str
    question: str
    threadId: str

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled system error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An unexpected error occurred. Please try again."
        }
    )

@app.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    uid = current_user.get("uid")
    if not uid:
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Unauthorized user session."}
        )

    is_pdf = file.content_type == "application/pdf" or file.filename.lower().endswith(".pdf")
    if not is_pdf:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Only PDF documents are supported at the moment."}
        )

    logger.info("Upload started")
    content = await file.read()
    max_size = 20 * 1024 * 1024
    if len(content) > max_size:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Maximum allowed file size is 20 MB."}
        )

    pages_data = PDFService.extract_text_from_pdf_bytes(content)
    if pages_data is None:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "This PDF appears to be scanned or contains no selectable text."
            }
        )
    logger.info("PDF parsed")

    try:
        document_id = f"doc-{int(uuid.uuid4().time_low)}"

        # Store PDF in MongoDB GridFS
        file_id = fs.put(content, filename=file.filename, content_type="application/pdf")
        grid_fs_id = str(file_id)
        
        # Download URL pointing to the local serving endpoint
        backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        download_url = f"{backend_url}/documents/{document_id}/file"

        # Save extracted text JSON locally
        PDFService.save_extracted_text(document_id, pages_data)

        # Chunk the extracted text
        chunk_meta = ChunkService.chunk_document(document_id)
        logger.info("Chunks generated")

        # Generate embeddings for chunks
        embed_meta = EmbeddingService.generate_embeddings(document_id)
        logger.info("Embeddings generated")

        # Index vectors inside ChromaDB
        db_meta = VectorDBService.index_document(document_id, uid, file.filename)
        logger.info("Chroma updated")

        # Save metadata inside Firestore
        db = firestore.client()
        doc_ref = db.collection("documents").document(document_id)
        
        doc_data = {
            "documentId": document_id,
            "userId": uid,
            "fileName": file.filename,
            "fileSize": len(content),
            "totalPages": len(pages_data),
            "totalChunks": chunk_meta["totalChunks"],
            "averageChunkSize": chunk_meta["averageChunkSize"],
            "totalWords": chunk_meta["totalWords"],
            "gridFsId": grid_fs_id,
            "downloadURL": download_url,
            "uploadedAt": firestore.SERVER_TIMESTAMP,
            "status": "uploaded"
        }
        doc_ref.set(doc_data)

        return {
            "success": True,
            "message": "Document uploaded successfully.",
            "document": {
                "id": document_id,
                "name": file.filename,
                "fileUrl": download_url,
                "totalPages": len(pages_data),
                "totalChunks": chunk_meta["totalChunks"],
                "averageChunkSize": chunk_meta["averageChunkSize"],
                "totalWords": chunk_meta["totalWords"]
            }
        }
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Unable to upload your document. Please try again."}
        )

@app.get("/documents")
async def get_documents(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    if not uid:
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Unauthorized user session."}
        )

    try:
        db = firestore.client()
        docs = db.collection("documents").where(filter=FieldFilter("userId", "==", uid)).stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            results.append({
                "id": data.get("documentId"),
                "name": data.get("fileName"),
                "fileSize": data.get("fileSize"),
                "fileUrl": data.get("downloadURL"),
                "status": data.get("status"),
                "uploadDate": str(data.get("uploadedAt"))
            })
            
        return results
    except Exception as e:
        logger.error(f"Fetch documents failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Unable to fetch documents."}
        )

@app.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    uid = current_user.get("uid")
    if not uid:
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Unauthorized user session."}
        )

    try:
        # Temporary log to verify delete endpoint is reached
        print("Delete request received")
        logger.info("Delete request received")

        db = firestore.client()
        doc_ref = db.collection("documents").document(document_id)
        doc_snap = doc_ref.get()

        if not doc_snap.exists:
            raise HTTPException(status_code=404, detail="Document not found.")

        doc_data = doc_snap.to_dict()
        if doc_data.get("userId") != uid:
            raise HTTPException(status_code=403, detail="Permission denied to delete this document.")

        # 1. Delete from MongoDB GridFS
        grid_fs_id = doc_data.get("gridFsId")
        if grid_fs_id:
            try:
                fs.delete(ObjectId(grid_fs_id))
            except Exception as e:
                logger.warning(f"GridFS file delete warning: {e}")

        # 2. Delete from ChromaDB
        try:
            VectorDBService.delete_document_vectors(document_id)
        except Exception as e:
            logger.warning(f"ChromaDB item delete warning: {e}")

        # 3. Delete local generated JSON files
        try:
            processed_file = BASE_DIR / "uploads" / "processed" / f"{document_id}.json"
            if processed_file.exists():
                processed_file.unlink()

            chunks_file = BASE_DIR / "uploads" / "chunks" / f"{document_id}.json"
            if chunks_file.exists():
                chunks_file.unlink()

            embeddings_file = BASE_DIR / "uploads" / "embeddings" / f"{document_id}.json"
            if embeddings_file.exists():
                embeddings_file.unlink()
        except Exception as e:
            logger.warning(f"Local file deletion warning: {e}")

        # 4. Delete related threads and chats from Firestore
        try:
            threads_ref = db.collection("threads").where(filter=FieldFilter("documentId", "==", document_id))
            threads_snap = threads_ref.stream()
            for t_doc in threads_snap:
                thread_id = t_doc.id
                # Delete chats in this thread
                chats_ref = db.collection("chats").where(filter=FieldFilter("threadId", "==", thread_id))
                chats_snap = chats_ref.stream()
                for c_doc in chats_snap:
                    c_doc.reference.delete()
                # Delete thread
                t_doc.reference.delete()
        except Exception as e:
            logger.warning(f"Firestore thread/chat cleanup warning: {e}")

        # 5. Delete Firestore metadata record
        doc_ref.delete()

        return {"success": True, "message": "Document deleted successfully."}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Delete document failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Unable to delete document."}
        )

@app.get("/documents/{document_id}/chunks")
async def get_document_chunks(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    uid = current_user.get("uid")
    if not uid:
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Unauthorized user session."}
        )

    try:
        db = firestore.client()
        doc_ref = db.collection("documents").document(document_id)
        doc_snap = doc_ref.get()

        if not doc_snap.exists:
            raise HTTPException(status_code=404, detail="Document not found.")

        doc_data = doc_snap.to_dict()
        if doc_data.get("userId") != uid:
            raise HTTPException(status_code=403, detail="Permission denied to access this document's chunks.")

        chunks_path = Path(__file__).parent / "uploads" / "chunks" / f"{document_id}.json"
        if not chunks_path.exists():
            raise HTTPException(status_code=404, detail="Chunks not generated for this document.")

        with open(chunks_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)

        return chunks
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Fetch chunks failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Unable to fetch document chunks."}
        )

@app.get("/documents/{document_id}/embeddings")
async def get_document_embeddings_debug(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    uid = current_user.get("uid")
    if not uid:
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Unauthorized user session."}
        )

    try:
        import datetime
        db = firestore.client()
        doc_ref = db.collection("documents").document(document_id)
        doc_snap = doc_ref.get()

        if not doc_snap.exists:
            raise HTTPException(status_code=404, detail="Document not found.")

        doc_data = doc_snap.to_dict()
        if doc_data.get("userId") != uid:
            raise HTTPException(status_code=403, detail="Permission denied to access this document's embeddings.")

        embeddings_path = Path(__file__).parent / "uploads" / "embeddings" / f"{document_id}.json"
        if not embeddings_path.exists():
            raise HTTPException(status_code=404, detail="Embeddings not generated for this document.")

        with open(embeddings_path, "r", encoding="utf-8") as f:
            embedded_chunks = json.load(f)

        generated_at = datetime.datetime.fromtimestamp(embeddings_path.stat().st_mtime).isoformat()

        return {
            "totalChunks": len(embedded_chunks),
            "embeddingDimension": 384,
            "generatedAt": generated_at
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Fetch embeddings debug failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Unable to fetch document embeddings metadata."}
        )

@app.get("/documents/{document_id}/vector-status")
async def get_vector_status(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    uid = current_user.get("uid")
    if not uid:
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Unauthorized user session."}
        )

    try:
        db = firestore.client()
        doc_ref = db.collection("documents").document(document_id)
        doc_snap = doc_ref.get()

        if not doc_snap.exists:
            raise HTTPException(status_code=404, detail="Document not found.")

        doc_data = doc_snap.to_dict()
        if doc_data.get("userId") != uid:
            raise HTTPException(status_code=403, detail="Permission denied to access this document's vector status.")

        status_info = VectorDBService.get_indexing_status(document_id)
        return status_info
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Fetch vector status failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Unable to fetch vector indexing status."}
        )

@app.delete("/documents/{document_id}/vectors")
async def delete_document_vectors_endpoint(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    uid = current_user.get("uid")
    if not uid:
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Unauthorized user session."}
        )

    try:
        db = firestore.client()
        doc_ref = db.collection("documents").document(document_id)
        doc_snap = doc_ref.get()

        if not doc_snap.exists:
            raise HTTPException(status_code=404, detail="Document not found.")

        doc_data = doc_snap.to_dict()
        if doc_data.get("userId") != uid:
            raise HTTPException(status_code=403, detail="Permission denied to delete this document's vectors.")

        VectorDBService.delete_document_vectors(document_id)
        return {"success": True, "message": "Document vectors deleted successfully from ChromaDB."}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Delete vectors failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Unable to delete document vectors."}
        )

@app.post("/retrieve")
async def retrieve_matching_chunks(
    request: RetrievalRequest,
    current_user: dict = Depends(get_current_user)
):
    uid = current_user.get("uid")
    if not uid:
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Unauthorized user session."}
        )

    try:
        db = firestore.client()
        doc_ref = db.collection("documents").document(request.documentId)
        doc_snap = doc_ref.get()

        if not doc_snap.exists:
            raise HTTPException(status_code=404, detail="Document not found.")

        doc_data = doc_snap.to_dict()
        if doc_data.get("userId") != uid:
            raise HTTPException(status_code=403, detail="Permission denied to access this document's context.")

        chunks = RetrieverService.retrieve_chunks(request.documentId, request.question)
        
        if not chunks:
            return {
                "success": False,
                "message": "No relevant information found."
            }

        prompt = PromptBuilder.build_prompt(request.question, chunks)

        return {
            "success": True,
            "chunks": chunks,
            "prompt": prompt
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Retrieval failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Unable to perform information retrieval."}
        )

@app.post("/query")
async def query_document(
    request: QueryRequest,
    current_user: dict = Depends(get_current_user)
):
    uid = current_user.get("uid")
    if not uid:
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Unauthorized user session."}
        )

    try:
        # Check permissions
        db = firestore.client()
        doc_ref = db.collection("documents").document(request.documentId)
        doc_snap = doc_ref.get()

        if not doc_snap.exists:
            raise HTTPException(status_code=404, detail="Document not found.")

        doc_data = doc_snap.to_dict()
        if doc_data.get("userId") != uid:
            raise HTTPException(status_code=403, detail="Permission denied to access this document.")

        # 1. Retrieve chunks
        chunks = RetrieverService.retrieve_chunks(request.documentId, request.question)
        
        # 2. Build prompt
        prompt = PromptBuilder.build_prompt(request.question, chunks)

        # 3. Call Gemini
        result = GeminiService.generate_response(prompt)
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Query failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Unable to generate response. Please try again."}
        )

@app.post("/chat")
async def chat_with_document(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    uid = current_user.get("uid")
    if not uid:
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Unauthorized user session."}
        )

    try:
        db = firestore.client()
        
        # 1. Verify document ownership
        doc_ref = db.collection("documents").document(request.documentId)
        doc_snap = doc_ref.get()

        if not doc_snap.exists:
            raise HTTPException(status_code=404, detail="Document not found.")

        doc_data = doc_snap.to_dict()
        if doc_data.get("userId") != uid:
            raise HTTPException(status_code=403, detail="Permission denied to access this document's context.")

        # 2. Fetch conversation history for memory
        messages_ref = db.collection("chats")
        messages_query = messages_ref.where(filter=FieldFilter("threadId", "==", request.threadId)).stream()
        
        history_msgs = []
        for msg in messages_query:
            m_data = msg.to_dict()
            m_data["id"] = msg.id
            history_msgs.append(m_data)
            
        # Sort messages locally by the millisecond timestamp suffix in the message ID
        def get_msg_timestamp(msg_dict):
            msg_id = msg_dict.get("id", "")
            try:
                return int(msg_id.split("-")[-1])
            except Exception:
                return 0
        history_msgs.sort(key=get_msg_timestamp)
        
        # Get last 6 messages
        last_messages = history_msgs[-6:]
        history_lines = []
        for m in last_messages:
            sender = "User" if m.get("sender") == "user" else "AI"
            history_lines.append(f"{sender}: {m.get('text')}")
            
        history_str = "\n".join(history_lines)

        # 3. Retrieve chunks
        chunks = RetrieverService.retrieve_chunks(request.documentId, request.question)
        
        # 4. Build prompt
        prompt = PromptBuilder.build_prompt(request.question, chunks, history_str)

        # 5. Call Gemini
        logger.info("Gemini request started")
        gemini_result = GeminiService.generate_response(prompt)
        
        answer = "Unable to generate response. Please try again."
        if gemini_result.get("success"):
            logger.info("Gemini response received")
            answer = gemini_result.get("answer", "")
        else:
            answer = f"Error generating response: {gemini_result.get('message')}"

        # 6. Extract source pages
        source_pages = list(set([c.get("pageStart") for c in chunks if c.get("pageStart") is not None]))
        source_pages.sort()

        # 7. Save AI message to Firestore
        ai_msg_id = f"msg-ai-{int(datetime.datetime.now().timestamp() * 1000)}"
        timestamp_str = datetime.datetime.now().strftime("%I:%M %p").lstrip("0")
        
        ai_msg_data = {
            "threadId": request.threadId,
            "sender": "ai",
            "text": answer,
            "userId": uid,
            "timestamp": timestamp_str,
            "sourcePages": source_pages
        }
        
        db.collection("chats").document(ai_msg_id).set(ai_msg_data)

        if gemini_result.get("success"):
            logger.info("Chat completed")

        return {
            "success": True,
            "answer": answer,
            "sourcePages": source_pages
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Chat failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Chat processing failed: {str(e)}"}
        )

@app.get("/documents/{document_id}/file")
async def get_document_file(document_id: str):
    """
    Serves the PDF file stored in MongoDB GridFS.
    Accessed publicly so that standard iframes can load it without authorization headers.
    """
    try:
        db = firestore.client()
        doc_snap = db.collection("documents").document(document_id).get()

        if not doc_snap.exists:
            raise HTTPException(status_code=404, detail="Document not found.")

        doc_data = doc_snap.to_dict()
        grid_fs_id = doc_data.get("gridFsId")
        if not grid_fs_id:
            raise HTTPException(status_code=404, detail="File content not found in GridFS.")

        # GridFS get with ObjectId
        try:
            grid_out = fs.get(ObjectId(grid_fs_id))
        except Exception as ge:
            logger.error(f"GridFS file fetch error: {ge}", exc_info=True)
            return JSONResponse(
                status_code=404,
                content={"success": False, "message": "File not found in database storage."}
            )

        return StreamingResponse(
            io.BytesIO(grid_out.read()), 
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={doc_data.get('fileName', 'document.pdf')}"
            }
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Fetch file from GridFS failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Unable to fetch document file."}
        )

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "database": mongo_connected,
            "firestore": firestore_ready,
            "chromadb": chromadb_ready,
            "embedding": embedding_loaded,
            "gemini": gemini_ready
        }
    }
