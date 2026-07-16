"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  PanelLeftClose, 
  Sparkles
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { 
    threads, 
    activeThreadId, 
    setActiveThreadId, 
    createThread, 
    deleteThread 
  } = useApp();

  const handleNewChat = () => {
    createThread("New Chat");
  };

  const handleDeleteThread = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteThread(id);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#0b0f19] text-slate-350 p-3.5 select-none font-sans">
      <div className="flex flex-col min-h-0 flex-1 space-y-4">
        {/* Sidebar Header & Toggle */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 bg-white rounded-lg flex items-center justify-center text-slate-900 shadow-md">
              <Sparkles className="h-3.5 w-3.5 fill-slate-900" />
            </div>
            <span className="font-bold text-xs text-white tracking-tight">DocMind AI</span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-slate-800 hover:text-white rounded-lg transition duration-150"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4.5 w-4.5 text-slate-400" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-0.5">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center space-x-2 py-2.5 px-3 bg-[#131926] hover:bg-[#1a2336] text-white border border-[#1e293b] rounded-xl text-xs font-semibold shadow-sm transition duration-150"
          >
            <Plus className="h-3.5 w-3.5 text-blue-400" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-0.5 space-y-1 min-h-0 pt-2">
          <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Chat History
          </h4>

          {threads.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 px-2 font-medium">
              No chat logs yet.
            </div>
          ) : (
            threads.map((thread) => {
              const isActive = activeThreadId === thread.id;
              return (
                <div
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 ${
                    isActive 
                      ? "bg-[#1a2336] text-white font-semibold border border-[#23304a]" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#131926]/60"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                    <span className="truncate">{thread.title}</span>
                  </div>
                  
                  <button
                    onClick={(e) => handleDeleteThread(e, thread.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition-opacity duration-150 shrink-0"
                    title="Delete Chat"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
