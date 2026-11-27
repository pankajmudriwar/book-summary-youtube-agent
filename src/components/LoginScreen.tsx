"use client";

import { useState } from "react";
import { Lock, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import YoutubeIcon from "./YoutubeIcon";

interface LoginScreenProps {
  onSuccess: () => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4 selection:bg-indigo-500/30">
      {/* Background glow */}
      <div className="absolute w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm bg-[#111114] border border-white/[0.08] rounded-2xl p-7 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500/20 via-indigo-500/20 to-indigo-500/30 border border-white/[0.1] flex items-center justify-center text-white mb-3 shadow-inner">
            <YoutubeIcon className="w-6 h-6 text-rose-500" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Marathi YT Studio
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Autonomous Book-Summary Pipeline
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-rose-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 font-mono">
              Admin Passcode
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter ADMIN_PASSWORD"
                required
                className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl px-4 py-2.5 pl-10 pr-10 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl text-xs font-mono transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-500/35"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Access Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
          <p className="text-[10px] text-zinc-600 font-mono">
            Protected Admin Area · Marathi Book Summary Studio
          </p>
        </div>
      </div>
    </div>
  );
}
