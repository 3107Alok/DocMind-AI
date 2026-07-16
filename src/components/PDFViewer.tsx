"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText } from "lucide-react";

export const PDFViewer: React.FC = () => {
  const { currentDoc, isAnalyzing, pdfPage, setPdfPage } = useApp();
  const [zoom, setZoom] = useState(100);

  if (isAnalyzing) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-4">
          <div className="h-6 w-1/3 bg-slate-200 animate-pulse rounded-lg" />
          <div className="h-96 w-full bg-slate-200 animate-pulse rounded-2xl" />
          <div className="h-4 w-2/3 bg-slate-200 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!currentDoc) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-8 text-slate-400">
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center max-w-sm">
          <FileText className="h-10 w-10 text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600 mb-1">No Document Loaded</p>
          <p className="text-xs text-slate-400">Upload a PDF or select one from the list to begin intelligence extraction.</p>
        </div>
      </div>
    );
  }

  const nextPage = () => {
    if (pdfPage < currentDoc.totalPages) setPdfPage(pdfPage + 1);
  };

  const prevPage = () => {
    if (pdfPage > 1) setPdfPage(pdfPage - 1);
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-full border-r border-slate-100 overflow-hidden">
      {/* Viewer toolbar */}
      <div className="h-12 border-b border-slate-100 bg-white px-4 flex items-center justify-between shrink-0">
        {/* Pagination buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={prevPage}
            disabled={pdfPage === 1}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-xs font-semibold text-slate-700 min-w-16 text-center">
            Page {pdfPage} of {currentDoc.totalPages || "?"}
          </span>
          <button
            onClick={nextPage}
            disabled={!currentDoc.totalPages || pdfPage === currentDoc.totalPages}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-slate-600 min-w-10 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Document Pages Container */}
      <div className="flex-1 p-8 overflow-y-auto flex justify-center items-start">
        {currentDoc.fileUrl ? (
          <div 
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            className="w-full max-w-2xl bg-white border border-slate-200 shadow-md rounded-2xl overflow-hidden aspect-[1/1.41] flex flex-col justify-between transition-transform duration-150 h-[800px]"
          >
            <iframe
              src={`${currentDoc.fileUrl}#page=${pdfPage}`}
              className="w-full h-full border-none"
              title={currentDoc.name}
            />
          </div>
        ) : (
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            className="w-full max-w-2xl bg-white border border-slate-200 shadow-md rounded-2xl min-h-[500px] flex flex-col justify-center items-center p-10 transition-transform duration-150"
          >
            <FileText className="h-12 w-12 text-slate-300 mb-3 animate-pulse" />
            <p className="text-sm font-semibold text-slate-500">Document URL is not ready</p>
            <p className="text-xs text-slate-400 mt-1">Waiting for document file URL from backend integration.</p>
          </div>
        )}
      </div>
    </div>
  );
};
