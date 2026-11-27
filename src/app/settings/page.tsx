"use client";

import { useEffect, useState } from "react";
import type { AgentSettings } from "@/lib/types";
import {
  Settings,
  Mic,
  Volume2,
  Sliders,
  Upload,
  Check,
  AlertCircle,
  Play,
  ShieldCheck,
} from "lucide-react";
import YoutubeIcon from "@/components/YoutubeIcon";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Voice sample upload
  const [uploadingVoice, setUploadingVoice] = useState(false);

  // Voice cloning test
  const [testingVoice, setTestingVoice] = useState(false);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSaveSettings(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSettings(data);
      setMessage({ type: "success", text: "Settings saved successfully" });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update settings",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleVoiceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVoice(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/voice", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Voice upload failed");
      }

      setMessage({ type: "success", text: "Voice sample uploaded successfully to Supabase Storage" });
      loadSettings();
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Voice upload failed",
      });
    } finally {
      setUploadingVoice(false);
    }
  }

  async function handleTestVoice() {
    setTestingVoice(true);
    setTestAudioUrl(null);
    setMessage(null);

    try {
      const res = await fetch("/api/voice-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "नमस्कार, हे तुमच्या आवाजातील ऑडिओ चाचणीचे नमुना आहे.",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Voice test failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setTestAudioUrl(url);
      setMessage({ type: "success", text: "Voice test synthesized successfully!" });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Voice test failed",
      });
    } finally {
      setTestingVoice(false);
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-zinc-500 font-mono text-xs">
        <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <span>Loading studio configuration...</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-center text-rose-400 bg-[#111114] rounded-2xl border border-rose-500/25 font-mono text-xs">
        Could not load agent settings. Please ensure database tables and migrations are initialized.
      </div>
    );
  }

  const readiness = settings.readiness;

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            System Preferences
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5 mt-2">
          <Settings className="w-7 h-7 text-indigo-400" />
          <span>Studio Settings & Integrations</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Configure reference voice cloning, YouTube OAuth channel, automation cadence, and rendering format
        </p>
      </div>

      {/* Live System Readiness Overview Card */}
      {readiness && (
        <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
              System Pre-Flight Health Check
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                readiness.isReady
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              {readiness.isReady ? "READY TO PUBLISH" : "CONFIGURATION REQUIRED"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            {/* Gemini */}
            <div className="p-3 rounded-xl bg-[#09090B] border border-white/[0.06] flex items-center justify-between">
              <span className="text-zinc-400">Gemini API</span>
              <span className={readiness.checks.geminiKey ? "text-emerald-400" : "text-rose-400"}>
                {readiness.checks.geminiKey ? "Connected" : "Missing"}
              </span>
            </div>
            {/* GitHub */}
            <div className="p-3 rounded-xl bg-[#09090B] border border-white/[0.06] flex items-center justify-between">
              <span className="text-zinc-400">GitHub Actions</span>
              <span className={readiness.checks.githubConfig ? "text-emerald-400" : "text-rose-400"}>
                {readiness.checks.githubConfig ? "Configured" : "Missing"}
              </span>
            </div>
            {/* Voice */}
            <div className="p-3 rounded-xl bg-[#09090B] border border-white/[0.06] flex items-center justify-between">
              <span className="text-zinc-400">Voice Sample</span>
              <span className={readiness.checks.voiceSample ? "text-emerald-400" : "text-amber-400"}>
                {readiness.checks.voiceSample ? "Ready" : "Missing"}
              </span>
            </div>
            {/* YouTube */}
            <div className="p-3 rounded-xl bg-[#09090B] border border-white/[0.06] flex items-center justify-between">
              <span className="text-zinc-400">YouTube Auth</span>
              <span className={readiness.checks.youtubeConnected ? "text-emerald-400" : "text-rose-400"}>
                {readiness.checks.youtubeConnected ? "Connected" : "Needed"}
              </span>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-mono ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/25 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-[11px] underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Voice Sample Manager */}
      <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2.5 text-white font-semibold text-base border-b border-white/[0.08] pb-3">
          <Mic className="w-5 h-5 text-indigo-400" />
          <h2>1. Voice Cloning Reference Sample</h2>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Upload a clean 15–45 second WAV/MP3 recording of your voice speaking clearly without background noise or music.
          The pipeline clones this timbre for all Marathi book summary narrations.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50">
            <Upload className="w-4 h-4" />
            <span>{uploadingVoice ? "Uploading Audio..." : "Upload Voice Sample (.wav/.mp3)"}</span>
            <input
              type="file"
              accept="audio/wav,audio/mp3,audio/mpeg,audio/x-wav"
              onChange={handleVoiceUpload}
              disabled={uploadingVoice}
              className="hidden"
            />
          </label>

          {settings.voice_sample_url && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium font-mono">
              <Check className="w-4 h-4" /> Stored in Supabase Bucket
            </span>
          )}
        </div>

        {settings.voice_sample_url && (
          <div className="mt-3 p-4 rounded-xl bg-[#09090B] border border-white/[0.08] space-y-2">
            <p className="text-xs text-zinc-400 font-mono">Current Reference Audio Preview:</p>
            <audio controls src={settings.voice_sample_url} className="w-full h-9 rounded-lg" />
          </div>
        )}
      </div>

      {/* 2. Voice Cloning Server Settings */}
      <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2.5 text-white font-semibold text-base border-b border-white/[0.08] pb-3">
          <Volume2 className="w-5 h-5 text-indigo-400" />
          <h2>2. Voice Cloning Engine Configuration</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 font-mono">
              Cloning Execution Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, voice_clone_mode: "external_api" })
                }
                className={`p-4 rounded-xl border text-left transition-all ${
                  settings.voice_clone_mode === "external_api"
                    ? "bg-indigo-500/10 border-indigo-500/40 text-white shadow-sm"
                    : "bg-[#09090B] border-white/[0.08] text-zinc-400 hover:text-white"
                }`}
              >
                <div className="font-semibold text-xs text-white">External Server API (Recommended)</div>
                <div className="text-[11px] text-zinc-400 mt-1 leading-snug">
                  Calls your hosted GPU voice cloning endpoint (FastAPI / XTTS-v2 server).
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, voice_clone_mode: "github_action_local" })
                }
                className={`p-4 rounded-xl border text-left transition-all ${
                  settings.voice_clone_mode === "github_action_local"
                    ? "bg-indigo-500/10 border-indigo-500/40 text-white shadow-sm"
                    : "bg-[#09090B] border-white/[0.08] text-zinc-400 hover:text-white"
                }`}
              >
                <div className="font-semibold text-xs text-white">GitHub Action Local Runner</div>
                <div className="text-[11px] text-zinc-400 mt-1 leading-snug">
                  Runs local synthesis on the GitHub Actions Ubuntu runner.
                </div>
              </button>
            </div>
          </div>

          {settings.voice_clone_mode === "external_api" && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1 font-mono">
                  Voice Server API Endpoint URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-gpu-server.com/synthesize"
                  value={settings.voice_clone_api_url || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, voice_clone_api_url: e.target.value })
                  }
                  className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1 font-mono">
                  API Key / Bearer Token (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Optional authorization token"
                  value={settings.voice_clone_api_key || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, voice_clone_api_key: e.target.value })
                  }
                  className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                />
              </div>
            </div>
          )}

          {/* Test Voice Button */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={handleTestVoice}
              disabled={testingVoice || !settings.voice_sample_url}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#09090B] hover:bg-[#18181D] border border-white/[0.08] text-white text-xs font-mono font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-indigo-400 fill-current" />
              <span>{testingVoice ? "Synthesizing Test..." : "Test Voice Synthesis (1 Marathi Sentence)"}</span>
            </button>

            {testAudioUrl && (
              <div className="flex-1">
                <audio controls src={testAudioUrl} className="w-full h-8" autoPlay />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. YouTube OAuth Channel Connection */}
      <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2.5 text-white font-semibold text-base border-b border-white/[0.08] pb-3">
          <YoutubeIcon className="w-5 h-5 text-rose-500" />
          <h2>3. YouTube Channel Publishing OAuth</h2>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Connect your Google account with YouTube Data API v3 permissions. When authorized, the worker uploads 1080p rendered summaries directly to your YouTube channel.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#09090B] border border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider font-mono">
                Connection Status:
              </span>
              {settings.youtube_refresh_token ? (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-4 h-4" /> Connected
                </span>
              ) : (
                <span className="text-xs text-rose-400 font-medium flex items-center gap-1 font-mono">
                  <AlertCircle className="w-4 h-4" /> Not Connected
                </span>
              )}
            </div>

            {settings.youtube_channel_name && (
              <p className="text-xs text-white font-mono mt-1">
                Channel: {settings.youtube_channel_name}
              </p>
            )}
          </div>

          <a
            href="/api/auth/youtube/connect"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-all shadow-lg shadow-rose-600/20"
          >
            <YoutubeIcon className="w-4 h-4" />
            <span>
              {settings.youtube_refresh_token ? "Reconnect Channel" : "Connect YouTube Channel"}
            </span>
          </a>
        </div>
      </div>

      {/* 4. Automation & Video Preferences */}
      <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-5">
        <div className="flex items-center gap-2.5 text-white font-semibold text-base border-b border-white/[0.08] pb-3">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h2>4. Automation Cadence & Video Preferences</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Daily Automation Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 font-mono">
              Daily Automation Schedule
            </label>
            <button
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  is_daily_automation_enabled: !settings.is_daily_automation_enabled,
                })
              }
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                settings.is_daily_automation_enabled
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-[#09090B] border-white/[0.08] text-zinc-400"
              }`}
            >
              <span className="text-xs font-medium font-mono">
                {settings.is_daily_automation_enabled ? "Enabled (04:00 UTC)" : "Paused"}
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  settings.is_daily_automation_enabled ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-zinc-600"
                }`}
              />
            </button>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">Runs 9:30 AM IST daily via Vercel Cron</p>
          </div>

          {/* YouTube Privacy Default */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 font-mono">
              Upload Privacy Default
            </label>
            <select
              value={settings.youtube_privacy_status}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  youtube_privacy_status: e.target.value as "private" | "unlisted" | "public",
                })
              }
              className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
            >
              <option value="private">Private (Recommended for verification)</option>
              <option value="unlisted">Unlisted (Accessible by direct link)</option>
              <option value="public">Public (Immediate live publish)</option>
            </select>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">Initial visibility on YouTube</p>
          </div>

          {/* Video Aspect Ratio */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 font-mono">
              Video Aspect Ratio
            </label>
            <select
              value={settings.video_format}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  video_format: e.target.value as "16:9" | "9:16",
                })
              }
              className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
            >
              <option value="16:9">16:9 Landscape (1920x1080 Standard)</option>
              <option value="9:16">9:16 Vertical (1080x1920 Shorts)</option>
            </select>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">FFmpeg resolution profile</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => handleSaveSettings()}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs font-mono transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Save Studio Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
