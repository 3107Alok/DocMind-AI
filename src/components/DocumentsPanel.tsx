"use client";

import React, { useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { 
  FileText, 
  Trash2, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  Info,
  PanelRightClose,
  AlertTriangle
} from "lucide-react";

interface DocumentsPanelProps {
  onToggleCollapse?: () => void;
}

export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({ onToggleCollapse }) => {
  const { 
    documents, 
    currentDoc, 
    setCurrentDoc, 
    deleteDocument, 
    uploadDocument,
    isUploading,
    uploadProgress,
    isAnalyzing,
    uploadError,
    closeUploadError
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadDocument(e.target.files[0]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setDeleteTarget({ id, name });
  };

  return (
    <div className="w-full h-full p-4 flex flex-col justify-between overflow-hidden font-sans border-slate-200 select-none">
      {/* Upper Area */}
      <div className="flex flex-col min-h-0 flex-1 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 hover:bg-slate-200 hover:text-slate-800 rounded transition duration-150"
                title="Collapse documents panel"
              >
                <PanelRightClose className="h-4 w-4 text-slate-500" />
              </button>
            )}
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Document Context
            </h2>
          </div>
          <span className="text-[10px] font-bold bg-slate-200 text-slate-650 px-2 py-0.5 rounded-full">
            {documents.length} files
          </span>
        </div>

        {/* Upload Button */}
        <div className="shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            disabled={isUploading || isAnalyzing}
            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-[#131926] hover:bg-[#1a2336] text-white border border-[#1e293b] rounded-xl text-xs font-semibold shadow-sm transition duration-200 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                <span>Uploading... {uploadProgress !== null ? `${uploadProgress}%` : ""}</span>
              </>
            ) : isAnalyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                <span>Analyzing document...</span>
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 text-white" />
                <span>Upload Source File</span>
              </>
            )}
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-0">
          {documents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs font-medium">No source documents</p>
              <p className="text-[10px] text-slate-400 mt-1">Upload a PDF to link it as chat context.</p>
            </div>
          ) : (
            documents.map((doc) => {
              const isActive = currentDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setCurrentDoc(doc)}
                  className={`w-full text-left p-3 rounded-xl border cursor-pointer transition-all duration-200 flex items-start justify-between space-x-2 ${
                    isActive
                      ? "bg-white border-slate-200 shadow-md ring-1 ring-slate-100/50"
                      : "bg-white/50 border-slate-100 hover:bg-white hover:border-slate-250"
                  }`}
                >
                  <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                    <FileText className={`h-4.5 w-4.5 mt-0.5 shrink-0 ${isActive ? "text-slate-800" : "text-slate-400"}`} />
                    <div className="truncate flex-1">
                      <p className={`text-xs font-bold truncate leading-tight ${isActive ? "text-slate-900 font-extrabold" : "text-slate-700"}`}>
                        {doc.name}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">
                        {doc.totalPages || "?"} Pages &bull; {doc.uploadDate}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 shrink-0 pl-1.5 mt-0.5">
                    {isActive && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-800" />
                    )}
                    <button
                      onClick={(e) => handleDelete(e, doc.id, doc.name)}
                      className="p-1 hover:text-red-500 text-slate-450 hover:bg-red-50 rounded transition duration-150"
                      title="Delete document"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Info Notice */}
      {currentDoc ? (
        <div className="mt-3 bg-slate-50 border border-slate-150/40 rounded-xl p-3 flex items-start space-x-2 shrink-0">
          <Info className="h-3.5 w-3.5 text-slate-650 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-755 leading-normal font-medium">
            Active Chat Context is set to <strong className="font-bold text-slate-900">{currentDoc.name}</strong>. Chat messages will analyze this file.
          </p>
        </div>
      ) : (
        <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start space-x-2 shrink-0">
          <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 leading-normal">
            No active context. Select a document above to target questions to a specific source.
          </p>
        </div>
      )}

      {/* Clean Custom Upload Failure Modal */}
      {uploadError?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-sm scale-95 transform rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl transition-all duration-300">
            <div className="flex items-center space-x-3 text-red-500 mb-4">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-slate-800">{uploadError.title}</h2>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
              {uploadError.message}
            </p>

            <div className="flex justify-end">
              <button
                onClick={closeUploadError}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in duration-200">
          <div className="w-full max-w-sm scale-95 transform rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl transition-all duration-300 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-red-500 mb-4">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Delete Document?</h2>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
              Are you sure you want to delete <strong className="font-bold text-slate-900">{deleteTarget.name}</strong>? This action will permanently remove the document, its vector index, and all associated chat history.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition duration-150"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const targetId = deleteTarget.id;
                  setDeleteTarget(null);
                  await deleteDocument(targetId);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition duration-150"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
