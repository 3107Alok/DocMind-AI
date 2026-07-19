"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Sparkles, ShieldCheck, Mail, Lock } from "lucide-react";

export const LoginView: React.FC = () => {
  const { loginWithEmail, signupWithEmail, loginWithGoogle } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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
        setSuccessMessage("Account created! A verification link has been sent to your email. Please verify before signing in.");
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

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccessMessage("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError(err?.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradient backgrounds */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />

      {/* Main glassmorphism card */}
      <div className="w-full max-w-md bg-white/70 backdrop-blur-md border border-slate-100/50 rounded-3xl p-8 shadow-2xl relative z-10 text-center flex flex-col justify-between">

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
          <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 text-left">
            {error}
          </div>
        )}

        {/* Success Notice */}
        {successMessage && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 text-left">
            {successMessage}
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          type="button"
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="mt-6 w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-semibold text-sm text-slate-700 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <svg className="animate-spin h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {googleLoading ? "Signing in..." : "Continue with Google"}
        </button>

        {/* Divider */}
        <div className="mt-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleFormSubmit} className="mt-4 text-left space-y-4">
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
            disabled={loading || googleLoading}
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
