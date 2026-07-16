"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Sidebar } from "@/components/Sidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { Sparkles, Loader2, PanelLeftOpen, PanelRightOpen, LogOut } from "lucide-react";

export default function Dashboard() {
  const { user, loadingAuth, logout } = useApp();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDocPanelCollapsed, setIsDocPanelCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push("/");
    }
  }, [user, loadingAuth, router]);

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 bg-[#131926] rounded-2xl flex items-center justify-center text-white shadow-lg animate-bounce">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex items-center text-slate-550 font-semibold text-sm">
          <Loader2 className="h-4.5 w-4.5 animate-spin mr-2 text-indigo-500" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  const getDisplayName = () => {
    if (!user) return "";
    const prefix = user.email.split("@")[0] || "User";
    return prefix
      .split(/[\._\-+]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white font-sans text-slate-800 antialiased animate-in fade-in duration-200">
      {/* Left Sidebar (Collapsible ChatGPT-like Sidebar) */}
      <div 
        className={`h-full transition-all duration-300 ease-in-out shrink-0 bg-[#0b0f19] ${
          isSidebarCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-64"
        }`}
      >
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggleCollapse={() => setIsSidebarCollapsed(true)} 
        />
      </div>

      {/* Main Workspace Panel */}
      <div className="flex-1 h-full flex flex-col min-w-0 bg-white relative">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-100 px-6 flex items-center justify-between shrink-0 select-none bg-white z-20">
          <div className="flex items-center space-x-3">
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition duration-150"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-sm font-semibold text-slate-700 tracking-tight">DocMind Workspace</h1>
          </div>

          {/* Top-Right Profile and Panel Toggles */}
          <div className="flex items-center space-x-4">
            {isDocPanelCollapsed && (
              <button
                onClick={() => setIsDocPanelCollapsed(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition duration-150"
                title="Expand documents panel"
              >
                <PanelRightOpen className="h-5 w-5" />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 shadow-sm flex items-center justify-center text-slate-650 text-xs font-bold hover:bg-slate-200 transition duration-150">
                  {getDisplayName().charAt(0)}
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in duration-100">
                  <div className="px-4 py-2 border-b border-slate-50">
                    <p className="text-xs font-bold text-slate-700 truncate">{getDisplayName()}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center space-x-2.5 px-4 py-2 text-left text-xs font-medium text-slate-650 hover:bg-red-50 hover:text-red-500 transition duration-150"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Center Panel (Dedicated Entirely to Conversation) */}
        <div className="flex-1 overflow-hidden relative">
          <ChatPanel onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} isSidebarCollapsed={isSidebarCollapsed} />
        </div>
      </div>

      {/* Right Sidebar: Documents Panel (Collapsible) */}
      <div 
        className={`h-full transition-all duration-300 ease-in-out shrink-0 bg-slate-50/50 flex flex-col ${
          isDocPanelCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-80 border-l border-slate-200/80"
        }`}
      >
        <DocumentsPanel onToggleCollapse={() => setIsDocPanelCollapsed(true)} />
      </div>
    </div>
  );
}
