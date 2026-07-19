"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  signInWithPopup
} from "firebase/auth";
import { 
  collection, 
  doc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

export interface DocumentMeta {
  id: string;
  name: string;
  uploadDate: string;
  totalPages: number;
  summary: string;
  keywords: string[];
  importantDates: string[];
  importantNames: string[];
  fileUrl?: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  sourcePage?: number;
  sourcePages?: number[];
}

export interface ChatThread {
  id: string;
  title: string;
  documentId?: string; // Link to active document
  createdAt: string;
}

interface ConnectionErrorState {
  isOpen: boolean;
  title?: string;
  message?: string;
  showRetry?: boolean;
  retryCallback: (() => Promise<void> | void) | null;
}

interface UploadErrorState {
  isOpen: boolean;
  title: string;
  message: string;
}

interface AppContextType {
  user: { email: string } | null;
  loadingAuth: boolean;
  documents: DocumentMeta[];
  currentDoc: DocumentMeta | null;
  threads: ChatThread[];
  activeThreadId: string | null;
  chats: Record<string, ChatMessage[]>;
  isUploading: boolean;
  uploadProgress: number | null;
  isAnalyzing: boolean;
  isSendingChat: boolean;
  connectionError: ConnectionErrorState;
  uploadError: UploadErrorState | null;
  isFirebaseConfigured: boolean;
  showFirebaseWarning: boolean;
  pdfPage: number;
  showPdf: boolean;
  setPdfPage: (page: number) => void;
  setShowPdf: (val: boolean) => void;
  setShowFirebaseWarning: (val: boolean) => void;
  setCurrentDoc: (doc: DocumentMeta | null) => void;
  setActiveThreadId: (id: string | null) => void;
  createThread: (title?: string, documentId?: string) => void;
  deleteThread: (id: string) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  askQuestion: (question: string) => Promise<void>;
  closeErrorDialog: () => void;
  closeUploadError: () => void;
  triggerErrorDialog: (retry: () => Promise<void> | void) => void;
  triggerCustomErrorDialog: (title: string, message: string) => void;
  refreshDocuments: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [currentDoc, setCurrentDoc] = useState<DocumentMeta | null>(null);
  
  // Chat Threads
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  
  // Loading & Progress states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // PDF Page viewer states
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [showPdf, setShowPdf] = useState<boolean>(false);

  // Error States
  const [connectionError, setConnectionError] = useState<ConnectionErrorState>({
    isOpen: false,
    retryCallback: null
  });
  const [uploadError, setUploadError] = useState<UploadErrorState | null>(null);

  // Firebase Warning State
  const [showFirebaseWarning, setShowFirebaseWarning] = useState(false);

  // Helper to map and handle Firebase Auth Errors
  const triggerAuthErrorDialog = (error: any) => {
    const errorCode = error?.code || "";
    let title = "Something Went Wrong";
    let message = "An unexpected error occurred. Please try again.";

    switch (errorCode) {
      case "auth/invalid-credential":
        title = "Login Failed";
        message = "Invalid email or password. Please try again.";
        break;
      case "auth/user-not-found":
        title = "Login Failed";
        message = "No account found with this email.";
        break;
      case "auth/wrong-password":
        title = "Login Failed";
        message = "Incorrect password.";
        break;
      case "auth/email-already-in-use":
        title = "Account Exists";
        message = "An account with this email already exists.";
        break;
      case "auth/invalid-email":
        title = "Invalid Email";
        message = "Please enter a valid email address.";
        break;
      case "auth/network-request-failed":
        title = "Connection Failed";
        message = "Please check your internet connection and try again.";
        break;
      case "auth/too-many-requests":
        title = "Too Many Attempts";
        message = "Too many login attempts. Please try again later.";
        break;
      default:
        const errorMsg = error?.message || "";
        if (errorMsg.includes("verify your email")) {
          title = "Verification Required";
          message = "Please verify your email before logging in.";
        }
        break;
    }

    setConnectionError({
      isOpen: true,
      title,
      message,
      showRetry: false,
      retryCallback: null
    });
  };

  // Reset PDF page context on document changes
  useEffect(() => {
    setPdfPage(1);
    setShowPdf(false);
  }, [currentDoc]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingAuth(true);
      if (firebaseUser) {
        if (firebaseUser.emailVerified) {
          setUser({ email: firebaseUser.email || "" });
          
          try {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            await setDoc(userDocRef, {
              email: firebaseUser.email,
              lastLogin: serverTimestamp()
            }, { merge: true });
          } catch (e) {
            console.error("Firestore user creation failed", e);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch documents and threads from Firestore on login
  const refreshDocuments = async () => {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    try {
      const q = query(
        collection(db, "documents"), 
        where("userId", "==", auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const docsList: DocumentMeta[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        docsList.push({
          id: doc.id,
          name: data.fileName || data.name || "",
          uploadDate: data.uploadDate || "",
          totalPages: data.totalPages || 1,
          summary: data.summary || "",
          keywords: data.keywords || [],
          importantDates: data.importantDates || [],
          importantNames: data.importantNames || [],
          fileUrl: data.downloadURL || data.fileUrl || ""
        });
      });
      setDocuments(docsList);
    } catch (err) {
      console.error("Fetch docs failed", err);
    }
  };

  const refreshThreads = async () => {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    try {
      const q = query(
        collection(db, "threads"), 
        where("userId", "==", auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const threadsList: ChatThread[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        threadsList.push({
          id: doc.id,
          title: data.title || "Chat History",
          documentId: data.documentId || "",
          createdAt: data.createdAt || ""
        });
      });

      setThreads(threadsList);

      if (threadsList.length > 0) {
        const savedThreadId = typeof window !== "undefined" ? localStorage.getItem("docmind_active_thread_id") : null;
        const threadToActivate = threadsList.find(t => t.id === savedThreadId) || threadsList[0];
        setActiveThreadId(threadToActivate.id);
        threadsList.forEach(t => loadChatMessages(t.id));
      } else {
        createThread("New Chat");
      }
    } catch (err) {
      console.error("Fetch threads failed", err);
    }
  };

  const loadChatMessages = async (threadId: string) => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, "chats"), 
        where("threadId", "==", threadId)
      );
      const querySnapshot = await getDocs(q);
      const msgs: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          sender: data.sender || "user",
          text: data.text || "",
          timestamp: data.timestamp || "",
          sourcePages: data.sourcePages || []
        });
      });
      // Sort messages locally by the millisecond timestamp suffix in the message ID
      msgs.sort((a, b) => {
        const timeA = parseInt(a.id.split("-").pop() || "0", 10);
        const timeB = parseInt(b.id.split("-").pop() || "0", 10);
        return timeA - timeB;
      });
      setChats(prev => ({
        ...prev,
        [threadId]: msgs
      }));
    } catch (err) {
      console.error("Fetch chats failed", err);
    }
  };

  useEffect(() => {
    if (user) {
      refreshDocuments();
      refreshThreads();
    } else {
      setDocuments([]);
      setCurrentDoc(null);
      setThreads([]);
      setActiveThreadId(null);
      setChats({});
    }
  }, [user]);

  // Save active thread ID to local storage when changed
  useEffect(() => {
    if (activeThreadId && typeof window !== "undefined") {
      localStorage.setItem("docmind_active_thread_id", activeThreadId);
    }
  }, [activeThreadId]);

  // Restore document context when activeThreadId or documents loads/changes
  useEffect(() => {
    if (!activeThreadId || documents.length === 0 || threads.length === 0) return;
    
    const activeThread = threads.find(t => t.id === activeThreadId);
    if (activeThread && activeThread.documentId) {
      const linkedDoc = documents.find(d => d.id === activeThread.documentId);
      if (linkedDoc) {
        if (!currentDoc || currentDoc.id !== linkedDoc.id) {
          setCurrentDoc(linkedDoc);
        }
      }
    } else {
      if (currentDoc !== null) {
        setCurrentDoc(null);
      }
    }
  }, [activeThreadId, documents, threads]);

  // Sync document changes to thread context
  useEffect(() => {
    if (currentDoc && activeThreadId && threads.length > 0) {
      const activeThread = threads.find(t => t.id === activeThreadId);
      // Only write to Firestore if the association actually changed
      if (!activeThread || activeThread.documentId !== currentDoc.id) {
        const threadRef = doc(db, "threads", activeThreadId);
        const activeTitle = `Chat about ${currentDoc.name}`;
        setDoc(threadRef, {
          documentId: currentDoc.id,
          title: activeTitle
        }, { merge: true }).then(() => {
          setThreads(prev => prev.map(t => {
            if (t.id === activeThreadId) {
              return { ...t, documentId: currentDoc.id, title: activeTitle };
            }
            return t;
          }));
        });
      }
    }
  }, [currentDoc, activeThreadId, threads]);

  // Create Chat Thread
  const createThread = async (title: string = "New Chat", documentId?: string) => {
    if (!auth.currentUser) return;
    try {
      const newThreadId = `thread-${Date.now()}`;
      const newThreadData = {
        title,
        documentId: documentId || "",
        userId: auth.currentUser.uid,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      await setDoc(doc(db, "threads", newThreadId), newThreadData);

      const threadMeta: ChatThread = {
        id: newThreadId,
        title,
        documentId,
        createdAt: newThreadData.createdAt
      };

      setThreads(prev => [threadMeta, ...prev]);
      setActiveThreadId(newThreadId);
      setChats(prev => ({ ...prev, [newThreadId]: [] }));
    } catch (err) {
      console.error("Create thread failed", err);
    }
  };

  // Delete Chat Thread
  const deleteThread = async (id: string) => {
    try {
      await deleteDoc(doc(db, "threads", id));
      setThreads(prev => prev.filter(t => t.id !== id));
      setChats(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (activeThreadId === id) {
        setActiveThreadId(threads.find(t => t.id !== id)?.id || null);
      }
    } catch (err) {
      console.error("Delete thread failed", err);
    }
  };

  // Auth Methods
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      // Save/update user record in Firestore
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        await setDoc(userDocRef, {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          lastLogin: serverTimestamp()
        }, { merge: true });
      }
    } catch (error: any) {
      // User closed the popup — silent ignore
      if (error?.code === "auth/popup-closed-by-user") return;
      triggerAuthErrorDialog(error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      if (credential.user) {
        await credential.user.reload();
        if (!credential.user.emailVerified) {
          await signOut(auth);
          throw { code: "custom/email-unverified", message: "Please verify your email before logging in." };
        }
      }
    } catch (error) {
      triggerAuthErrorDialog(error);
      throw error;
    }
  };

  const signupWithEmail = async (email: string, pass: string) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      if (credential.user) {
        await sendEmailVerification(credential.user);
        await signOut(auth);
      }
    } catch (error) {
      triggerAuthErrorDialog(error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  // Dialog Close Methods
  const closeErrorDialog = () => {
    setConnectionError({ isOpen: false, retryCallback: null });
  };

  const closeUploadError = () => {
    setUploadError(null);
  };

  const triggerErrorDialog = (retry: () => Promise<void> | void) => {
    setConnectionError({
      isOpen: true,
      title: "Connection Failed",
      message: "The AI server is starting or temporarily unavailable. Please retry in a few moments.",
      showRetry: true,
      retryCallback: retry
    });
  };

  const triggerCustomErrorDialog = (title: string, message: string) => {
    setConnectionError({
      isOpen: true,
      title,
      message,
      showRetry: false,
      retryCallback: null
    });
  };

  // Upload Document to FastAPI backend /upload using multipart/form-data
  const uploadDocument = async (file: File) => {
    if (!auth.currentUser) return;

    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError({
        isOpen: true,
        title: "File Too Large",
        message: "Maximum allowed file size is 20 MB."
      });
      return;
    }

    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPDF) {
      setUploadError({
        isOpen: true,
        title: "Unsupported File",
        message: "Only PDF documents are supported at the moment."
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://docmind-ai-backend-vcvi.onrender.com";

      const formData = new FormData();
      formData.append("file", file);

      // Perform upload directly using Axios to monitor progress
      const response = await axios.post(`${apiUrl}/upload`, formData, {
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setUploadProgress(pct);
          }
        }
      });

      const resData = response.data;
      if (resData.success && resData.document) {
        const docInfo = resData.document;
        
        // Metadata is saved in Firestore by the FastAPI backend directly.
        // Update local documents list immediately so the UI reflects the change.
        const localMeta: DocumentMeta = {
          id: docInfo.id,
          name: docInfo.name,
          uploadDate: new Date().toLocaleDateString(),
          totalPages: docInfo.totalPages || 1,
          summary: "This is a placeholder summary. Configure document parsing on your backend APIs to extract real summaries.",
          keywords: ["PDF", "Source", "Context"],
          importantDates: [],
          importantNames: [],
          fileUrl: docInfo.fileUrl
        };

        setDocuments(prev => [localMeta, ...prev]);
        setCurrentDoc(localMeta);
        
        setUploadProgress(null);
        setIsUploading(false);
      } else {
        throw new Error(resData.message || "Failed to upload document");
      }
    } catch (err) {
      console.error("Direct upload failed", err);
      setIsUploading(false);
      setUploadProgress(null);
      setUploadError({
        isOpen: true,
        title: "Upload Failed",
        message: "Unable to upload your document. Please try again."
      });
    }
  };

  // Delete Document by calling backend DELETE /documents/{id}
  const deleteDocument = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://docmind-ai-backend-vcvi.onrender.com";

      const response = await fetch(`${apiUrl}/documents/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete document from backend");
      }

      // Update UI state immediately
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      if (currentDoc?.id === id) {
        setCurrentDoc(null);
      }
    } catch (err) {
      console.error("Delete failed", err);
      triggerErrorDialog(() => deleteDocument(id));
    }
  };

  // Ask question and log messages to Firestore, incorporating memory and calling FastAPI /chat API
  const askQuestion = async (text: string) => {
    if (!activeThreadId || !auth.currentUser) return;
    
    // Add user message locally first to show instantly
    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChats(prev => ({
      ...prev,
      [activeThreadId]: [...(prev[activeThreadId] || []), userMsg]
    }));

    setIsSendingChat(true);

    try {
      // 1. Save user message to Firestore
      await setDoc(doc(db, "chats", userMsgId), {
        threadId: activeThreadId,
        sender: "user",
        text,
        userId: auth.currentUser.uid,
        timestamp: userMsg.timestamp
      });

      if (!currentDoc) {
        const aiMsgId = `msg-ai-${Date.now()}`;
        const aiMsg: ChatMessage = {
          id: aiMsgId,
          sender: "ai",
          text: "Please select or upload a PDF document first in the Documents panel to target AI questions.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourcePages: []
        };
        await setDoc(doc(db, "chats", aiMsgId), {
          threadId: activeThreadId,
          sender: "ai",
          text: aiMsg.text,
          userId: auth.currentUser.uid,
          timestamp: aiMsg.timestamp,
          sourcePages: []
        });
        setChats(prev => ({
          ...prev,
          [activeThreadId]: [...(prev[activeThreadId] || []), aiMsg]
        }));
        return;
      }

      // 2. Call backend /chat API
      const idToken = await auth.currentUser.getIdToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://docmind-ai-backend-vcvi.onrender.com";
      
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          documentId: currentDoc.id,
          question: text,
          threadId: activeThreadId
        })
      });

      if (!response.ok) {
        throw new Error("Backend connection error");
      }

      const resData = await response.json();
      
      if (resData.success) {
        const aiMsgId = `msg-ai-${Date.now()}`;
        const aiMsg: ChatMessage = {
          id: aiMsgId,
          sender: "ai",
          text: resData.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourcePages: resData.sourcePages || []
        };
        
        // Local state update (the backend already saved it to Firestore)
        setChats(prev => ({
          ...prev,
          [activeThreadId]: [...(prev[activeThreadId] || []), aiMsg]
        }));
      } else {
        throw new Error(resData.message || "Query failed");
      }
    } catch (err) {
      console.error("Ask question failed", err);
      // Trigger the specialized "Connection Failed" sleep error modal!
      triggerErrorDialog(() => askQuestion(text));
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        loadingAuth,
        documents,
        currentDoc,
        threads,
        activeThreadId,
        chats,
        isUploading,
        uploadProgress,
        isAnalyzing,
        isSendingChat,
        connectionError,
        uploadError,
        isFirebaseConfigured: true,
        showFirebaseWarning,
        pdfPage,
        showPdf,
        setPdfPage,
        setShowPdf,
        setShowFirebaseWarning,
        setCurrentDoc,
        setActiveThreadId,
        createThread,
        deleteThread,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
        uploadDocument,
        deleteDocument,
        askQuestion,
        closeErrorDialog,
        closeUploadError,
        triggerErrorDialog,
        triggerCustomErrorDialog,
        refreshDocuments
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
