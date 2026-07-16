"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { LoginView } from "@/components/LoginView";
import { Sparkles, Loader2 } from "lucide-react";

export default function Home() {
  const { user, loadingAuth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && user) {
      router.push("/dashboard");
    }
  }, [user, loadingAuth, router]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg animate-bounce">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex items-center text-slate-550 font-semibold text-sm">
          <Loader2 className="h-4.5 w-4.5 animate-spin mr-2 text-indigo-500" />
          <span>Securing connection...</span>
        </div>
      </div>
    );
  }

  return <LoginView />;
}
