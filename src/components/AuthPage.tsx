"use client";

import React, { useState } from "react";
import { signUpUser, signInUser, signInWithGoogle } from "../lib/storage";
import { Sparkles, Shield, Heart, ArrowRight } from "lucide-react";

interface AuthPageProps {
  onAuthSuccess: (user: any) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password || (isSignUp && !name)) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      let user;
      if (isSignUp) {
        user = await signUpUser(email, password, name);
      } else {
        user = await signInUser(email, password);
      }
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await signInUser("demo@example.com", "password123");
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || "Failed to launch demo mode.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-slate-50 relative overflow-hidden select-none">
      {/* Dynamic background shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-100/30 blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-rose-100/20 blur-3xl -z-10 pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50 p-8 relative">
        {/* Decorative Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium rounded-full mb-6">
          <Heart className="w-3.5 h-3.5 fill-emerald-500 stroke-emerald-600" />
          Clarity Over Anxiety
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
          {isSignUp ? "Create a safe space" : "Welcome back"}
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          {isSignUp
            ? "Let's organize your active EMIs in a calm, stress-free layout."
            : "Take a deep breath. Let's review your breathing room today."}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="name">
                Your First Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-800 transition-all placeholder:text-slate-400"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-800 transition-all placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-800 transition-all placeholder:text-slate-400"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white font-medium rounded-xl text-sm hover:bg-slate-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
          >
            {loading ? "Please wait..." : isSignUp ? "Build My Dashboard" : "Sign In to Dashboard"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs text-slate-500 hover:text-emerald-600 transition-all cursor-pointer underline underline-offset-4"
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Create one"}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>
          <span className="relative bg-white px-3 text-xs text-slate-400">or</span>
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm active:scale-[0.99] mb-3"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Demo Mode Button */}
        <button
          type="button"
          onClick={handleDemoMode}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/50 text-emerald-800 font-semibold rounded-xl text-sm transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 fill-emerald-200 text-emerald-700" />
          Explore with Demo Mode
        </button>

        {/* Core Philosophy Footnote */}
        <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-slate-400 border-t border-slate-50 pt-4">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-slate-300" /> Secure Data
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          <span>No spam, ever.</span>
        </div>
      </div>
    </div>
  );
}
