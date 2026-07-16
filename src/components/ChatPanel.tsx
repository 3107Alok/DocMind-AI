"use client";

import React, { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { PDFViewer } from "@/components/PDFViewer";
import { 
  Send, 
  Paperclip, 
  Sparkles, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  UserCheck, 
  BookOpen, 
  X 
} from "lucide-react";

interface ChatPanelProps {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isSidebarCollapsed, onToggleSidebar }) => {
  const { 
    currentDoc, 
    activeThreadId, 
    threads, 
    chats, 
    askQuestion, 
    isSendingChat 
  } = useApp();

  const [input, setInput] = useState("");
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeThread = threads.find(t => t.id === activeThreadId);
  const docChats = activeThreadId ? chats[activeThreadId] || [] : [];

  // Reset PDF panel when document changes
  useEffect(() => {
    setShowPdf(false);
  }, [currentDoc]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSendingChat || !activeThreadId) return;

    const query = input;
    setInput("");
    await askQuestion(query);
  };

  const handleSuggest = async (suggestion: string) => {
    if (isSendingChat || !activeThreadId) return;
    await askQuestion(suggestion);
  };

  // Auto Scroll
  const [prevMessageCount, setPrevMessageCount] = useState(docChats.length);
  const [prevThreadId, setPrevThreadId] = useState(activeThreadId);

  useEffect(() => {
    if (activeThreadId !== prevThreadId) {
      setPrevThreadId(activeThreadId);
      setPrevMessageCount(docChats.length);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
    } else if (docChats.length > prevMessageCount || isSendingChat) {
      setPrevMessageCount(docChats.length);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [docChats.length, activeThreadId, isSendingChat, prevMessageCount, prevThreadId]);

  // If no chat thread is active
  if (!activeThreadId) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white text-center select-none h-full">
        <div className="max-w-md space-y-4 flex flex-col items-center">
          <div className="h-12 w-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-slate-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">No Active Chat</h2>
          <p className="text-xs text-slate-500">
            Create a new chat in the left sidebar or select an existing conversation to begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      
      {/* Sliding PDF Side-Panel (takes 45% width when open, NotebookLM-style) */}
      {showPdf && currentDoc && (
        <div className="w-[45%] h-full flex flex-col border-r border-slate-200 bg-white shrink-0 animate-in slide-in-from-left duration-250 relative">
          <button
            onClick={() => setShowPdf(false)}
            className="absolute top-3.5 right-3.5 z-30 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
            title="Close source"
          >
            <X className="h-4 w-4" />
          </button>
          <PDFViewer />
        </div>
      )}

      {/* Main Conversation Flow Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white border-t border-slate-100">
        
        {/* Active Context Header */}
        {currentDoc ? (
          <div className="border-b border-slate-100 bg-slate-55/20 shrink-0 z-10">
            <div className="px-5 py-2.5 flex items-center justify-between">
              <div 
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="flex items-center space-x-2 cursor-pointer hover:opacity-80"
              >
                <Sparkles className="h-4 w-4 text-slate-800 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Context: {currentDoc.name}
                </span>
                {isSummaryExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                )}
              </div>

              {/* View Source Trigger */}
              <div className="flex items-center space-x-2">
                {!showPdf && (
                  <button
                    onClick={() => setShowPdf(true)}
                    className="flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 rounded-lg transition"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>View PDF Source</span>
                  </button>
                )}
                <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-semibold">
                  {currentDoc.totalPages || "?"} Pages
                </span>
              </div>
            </div>

            {/* Accordion Summary */}
            {isSummaryExpanded && (
              <div className="px-5 pb-5 pt-1.5 border-t border-slate-100 bg-slate-50/50 space-y-4 text-left animate-in slide-in-from-top-1 duration-200">
                <p className="text-xs text-slate-650 leading-relaxed font-normal">
                  {currentDoc.summary || "No summary ready. Backend pipeline required to analyze."}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <span className="flex items-center text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                      <Tag className="h-3 w-3 mr-1" /> Keywords
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {currentDoc.keywords && currentDoc.keywords.length > 0 ? (
                        currentDoc.keywords.map((kw, i) => (
                          <span key={`${kw}-${i}`} className="text-[9px] bg-white border border-slate-200/50 text-slate-650 px-2 py-0.5 rounded font-medium">
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] text-slate-400 italic">None</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="flex items-center text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                      <UserCheck className="h-3 w-3 mr-1" /> Parties
                    </span>
                    <div className="text-[10px] font-semibold text-slate-650 truncate">
                      {currentDoc.importantNames && currentDoc.importantNames.length > 0 
                        ? currentDoc.importantNames.join(", ") 
                        : "None identified"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0 z-10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>General Conversation (No active PDF context)</span>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded">
              General
            </span>
          </div>
        )}

        {/* Active Document Context Banner */}
        {currentDoc && (
          <div className="mx-6 mt-4 p-3 bg-slate-55/40 border border-slate-150/50 rounded-xl flex items-start space-x-3 shrink-0 shadow-sm">
            <span className="text-sm shrink-0 mt-0.5">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">
                Active Document:
              </p>
              <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                {currentDoc.name} <span className="text-slate-450 font-medium">({currentDoc.totalPages || "?"} pages)</span>
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold flex items-center mt-1">
                <span className="mr-1">✓</span> AI answers are based on this document.
              </p>
            </div>
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {docChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-16">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                <Sparkles className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-xs font-bold text-slate-700">
                {currentDoc ? `Chatting with ${currentDoc.name}` : "Ask anything"}
              </h3>
              <p className="text-[11px] text-slate-500 max-w-xs text-center leading-normal">
                {currentDoc 
                  ? "Enter your questions below. AI will respond using details from this active document context." 
                  : "Select a document in the right sidebar to target questions to a specific PDF context."}
              </p>
            </div>
          ) : (
            docChats.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${
                      isUser
                        ? "bg-slate-900 text-white rounded-br-sm"
                        : "bg-slate-50 border border-slate-150/60 text-slate-700 rounded-bl-sm"
                    }`}
                  >
                    <p className="font-normal whitespace-pre-wrap">{msg.text}</p>
                    
                    <div className="mt-2.5 flex items-center justify-between text-[9px] font-semibold opacity-85 space-x-4">
                      {!isUser && msg.sourcePage && (
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded">
                          Page {msg.sourcePage}
                        </span>
                      )}
                      <span className={isUser ? "text-slate-400 ml-auto" : "text-slate-400 ml-auto"}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isSendingChat && (
            <div className="flex justify-start">
              <div className="bg-slate-50 border border-slate-100 max-w-[80%] rounded-2xl rounded-bl-sm p-4 shadow-sm flex items-center space-x-2 text-slate-550 text-xs font-semibold">
                <Loader2 className="h-4 w-4 animate-spin text-blue-550" />
                <span>DocMind AI is reading...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        {currentDoc && docChats.length === 0 && (
          <div className="px-6 pb-2 pt-2 flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSuggest("What is this document about?")}
              className="flex items-center space-x-1 text-[10px] font-bold text-slate-650 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 hover:border-slate-200 px-2.5 py-1.5 rounded-lg transition duration-150 shadow-sm"
            >
              <span>💡</span>
              <span>Analyze Purpose</span>
            </button>
            <button
              type="button"
              onClick={() => handleSuggest("What is the payment clause?")}
              className="flex items-center space-x-1 text-[10px] font-bold text-slate-650 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 hover:border-slate-200 px-2.5 py-1.5 rounded-lg transition duration-150 shadow-sm"
            >
              <span>💳</span>
              <span>Payment Terms</span>
            </button>
          </div>
        )}

        {/* Sticky Chat Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-150/40 bg-white flex items-center space-x-3 shrink-0">
          <div className="flex-1 bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-2 flex items-center space-x-2 focus-within:bg-white focus-within:ring-1 focus-within:ring-slate-500/20 focus-within:border-slate-500/50 transition duration-200">
            <button
              type="button"
              title="Attach files"
              className="p-1 hover:bg-slate-200/50 text-slate-400 hover:text-slate-750 rounded-lg transition"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            
            <button
              type="button"
              title="Voice input"
              className="p-1 hover:bg-slate-200/50 text-slate-400 hover:text-slate-750 rounded-lg transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={currentDoc ? "Ask anything about this document..." : "Type your message..."}
              disabled={isSendingChat}
              className="flex-1 text-xs bg-transparent outline-none text-slate-800 placeholder-slate-400 font-medium py-1"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isSendingChat}
            className="h-9 w-9 shrink-0 bg-[#131926] hover:bg-[#1a2336] text-white border border-[#1e293b] rounded-full flex items-center justify-center shadow-md transition duration-150 disabled:opacity-85"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
