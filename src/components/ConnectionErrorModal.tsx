"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { AlertCircle } from "lucide-react";

export const ConnectionErrorModal: React.FC = () => {
  const { connectionError, closeErrorDialog } = useApp();

  if (!connectionError.isOpen) return null;

  const handleRetry = async () => {
    const callback = connectionError.retryCallback;
    closeErrorDialog();
    if (callback) {
      await callback();
    }
  };

  const title = connectionError.title || "Connection Failed";
  const message = connectionError.message || "Unable to reach the AI server. The server may be starting or temporarily unavailable. Please retry in a few moments.";
  const showRetry = connectionError.showRetry !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-sm scale-95 transform rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95">
        <div className="flex items-center space-x-3 text-red-500 mb-4">
          <div className="p-2 bg-red-50 rounded-xl">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
        </div>
        
        <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
          {message}
        </p>

        <div className="flex space-x-3 justify-end">
          <button
            onClick={closeErrorDialog}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition duration-150"
          >
            {showRetry ? "Cancel" : "Close"}
          </button>
          {showRetry && (
            <button
              onClick={handleRetry}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition duration-150"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
