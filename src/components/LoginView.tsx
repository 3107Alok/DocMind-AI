"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Sparkles, ShieldCheck, Mail, Lock } from "lucide-react";

export const LoginView: React.FC = () => {
  const { loginWithEmail, signupWithEmail } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email || !password) {
      setError("Please fill out all fields.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signupWithEmail(email, password);
        setSuccessMessage("Your account has been created successfully. A verification email has been sent to your email address. Please verify your email before logging in.");
        setIsSignUp(false);
        setPassword("");
        setConfirmPassword("");
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradient backgrounds */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />

      {/* Main glassmorphism card */}
      <div className="w-full max-w-md bg-white/70 backdrop-blur-md border border-slate-100/50 rounded-3xl p-8 shadow-2xl relative z-10 text-center flex flex-col justify-between min-h-[500px]">
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex h-12 w-12 bg-slate-900 rounded-2xl items-center justify-center text-white shadow-lg mx-auto">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">DocMind AI</h1>
          <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">
            Extract insights, summarize agreements, and query clauses instantly using Document Intelligence.
          </p>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mt-4 p-3.5 bg-red-50 border border-red-150/40 rounded-xl text-xs font-semibold text-red-650 text-left">
            {error}
          </div>
        )}

        {/* Success Notice */}
        {successMessage && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-150/40 rounded-xl text-xs font-semibold text-emerald-700 text-left">
            {successMessage}
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleFormSubmit} className="mt-6 text-left space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 focus:border-slate-200 outline-none rounded-xl text-sm transition duration-200 text-slate-700"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 focus:border-slate-200 outline-none rounded-xl text-sm transition duration-200 text-slate-700"
              />
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 focus:border-slate-200 outline-none rounded-xl text-sm transition duration-200 text-slate-700"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-sm transition duration-200 disabled:opacity-50"
          >
            {loading 
              ? "Authenticating..." 
              : isSignUp 
                ? "Create Account" 
                : "Sign In"}
          </button>
        </form>

        {/* Toggle Switch */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setSuccessMessage("");
            }}
            className="text-xs font-bold text-blue-600 hover:text-blue-750 hover:underline transition"
          >
            {isSignUp 
              ? "Already have an account? Sign In" 
              : "Don't have an account? Sign Up"}
          </button>
        </div>

        {/* Footer info banner */}
        <div className="mt-6 flex items-center justify-center space-x-1.5 text-[10px] text-slate-400 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
          <span>Firebase Authentication Provider</span>
        </div>
      </div>
    </div>
  );
};
