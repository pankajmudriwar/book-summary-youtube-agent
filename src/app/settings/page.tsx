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
  ExternalLink,
  ShieldCheck,
  Sparkles,
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
      setMessage({ type: "success", text: "Settings updated successfully" });
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

      setMessage({ type: "success", text: "Voice sample uploaded successfully" });
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
      <div className="p-12 text-center text-gray-500">
        <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
        <span>Loading settings...</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-center text-red-400 bg-[#151C2C] rounded-2xl border border-red-500/20">
        Could not load agent settings. Please ensure database tables are created.
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-blue-400" />
          <span>Agent Configuration & Integrations</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure reference voice cloning, YouTube OAuth, automation schedules, and rendering preferences
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
            message.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <Check className="w-4 h-4 shrink-0 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Voice Sample Manager */}
      <div className="p-6 rounded-2xl bg-[#151C2C] border border-[#1E293B] space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-lg border-b border-[#1E293B] pb-3">
          <Mic className="w-5 h-5 text-purple-400" />
          <h2>1. Voice Cloning Reference Sample</h2>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Upload a single 15–45 second clean WAV/MP3 recording of your voice speaking clearly without background noise.
          The agent will clone this timbre for all automated Marathi book summary narrations.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-lg shadow-purple-600/20 disabled:opacity-50">
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
            <span className="text-xs text-green-400 flex items-center gap-1.5 font-medium">
              <Check className="w-4 h-4" /> Sample Stored in Supabase
            </span>
          )}
        </div>

        {settings.voice_sample_url && (
          <div className="mt-3 p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
            <p className="text-xs text-gray-400 mb-2">Current Reference Audio Preview:</p>
            <audio controls src={settings.voice_sample_url} className="w-full h-9" />
          </div>
        )}
      </div>

      {/* 2. Voice Cloning Server Settings */}
      <div className="p-6 rounded-2xl bg-[#151C2C] border border-[#1E293B] space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-lg border-b border-[#1E293B] pb-3">
          <Volume2 className="w-5 h-5 text-blue-400" />
          <h2>2. Voice Cloning Model / Server</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Cloning Execution Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, voice_clone_mode: "external_api" })
                }
                className={`p-4 rounded-xl border text-left transition-colors ${
                  settings.voice_clone_mode === "external_api"
                    ? "bg-blue-600/10 border-blue-500 text-white"
                    : "bg-[#0B0F19] border-[#1E293B] text-gray-400 hover:text-white"
                }`}
              >
                <div className="font-semibold text-sm">External Server API (Recommended)</div>
                <div className="text-xs text-gray-400 mt-1">
                  Calls your hosted GitHub voice cloning repo endpoint (RunPod / GPU VM / FastAPI wrapper).
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, voice_clone_mode: "github_action_local" })
                }
                className={`p-4 rounded-xl border text-left transition-colors ${
                  settings.voice_clone_mode === "github_action_local"
                    ? "bg-blue-600/10 border-blue-500 text-white"
                    : "bg-[#0B0F19] border-[#1E293B] text-gray-400 hover:text-white"
                }`}
              >
                <div className="font-semibold text-sm">GitHub Action Local Runner</div>
                <div className="text-xs text-gray-400 mt-1">
                  Runs Coqui XTTS-v2 directly on the GitHub Actions Ubuntu CPU runner.
                </div>
              </button>
            </div>
          </div>

          {settings.voice_clone_mode === "external_api" && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Voice Server API Endpoint URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-gpu-server.com/synthesize"
                  value={settings.voice_clone_api_url || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, voice_clone_api_url: e.target.value })
                  }
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Deploy the ready-to-run template in <code className="text-blue-400">voice-server-template/server.py</code> to any GPU host.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  API Key / Bearer Token (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Optional authorization token"
                  value={settings.voice_clone_api_key || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, voice_clone_api_key: e.target.value })
                  }
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
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
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{testingVoice ? "Synthesizing Test..." : "Test Voice Cloning (1 Marathi Sentence)"}</span>
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
      <div className="p-6 rounded-2xl bg-[#151C2C] border border-[#1E293B] space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-lg border-b border-[#1E293B] pb-3">
          <YoutubeIcon className="w-5 h-5 text-red-500" />
          <h2>3. YouTube Channel Connection</h2>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Connect your YouTube account to authorize automated video uploads. When authorized, the worker uploads 1080p rendered book summaries directly to your channel.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                Connection Status:
              </span>
              {settings.youtube_refresh_token ? (
                <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Connected
                </span>
              ) : (
                <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Not Connected
                </span>
              )}
            </div>

            {settings.youtube_channel_name && (
              <p className="text-sm text-white font-medium mt-1">
                Channel: {settings.youtube_channel_name}
              </p>
            )}
          </div>

          <a
            href="/api/auth/youtube/connect"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors shadow-lg shadow-red-600/20"
          >
            <YoutubeIcon className="w-4 h-4" />
            <span>
              {settings.youtube_refresh_token ? "Reconnect Channel" : "Connect YouTube Channel"}
            </span>
          </a>
        </div>
      </div>

      {/* 4. Automation & Video Preferences */}
      <div className="p-6 rounded-2xl bg-[#151C2C] border border-[#1E293B] space-y-5">
        <div className="flex items-center gap-2 text-white font-semibold text-lg border-b border-[#1E293B] pb-3">
          <Sliders className="w-5 h-5 text-green-400" />
          <h2>4. Automation & Video Preferences</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Daily Automation Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
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
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                settings.is_daily_automation_enabled
                  ? "bg-green-600/10 border-green-500 text-green-300"
                  : "bg-[#0B0F19] border-[#1E293B] text-gray-400"
              }`}
            >
              <span className="text-sm font-medium">
                {settings.is_daily_automation_enabled ? "Enabled" : "Paused"}
              </span>
              <span
                className={`w-3 h-3 rounded-full ${
                  settings.is_daily_automation_enabled ? "bg-green-400" : "bg-gray-500"
                }`}
              />
            </button>
            <p className="text-[11px] text-gray-500 mt-1">Runs daily via Vercel Cron</p>
          </div>

          {/* YouTube Privacy Default */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
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
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="private">Private (Recommended for verification)</option>
              <option value="unlisted">Unlisted (Accessible by link)</option>
              <option value="public">Public (Immediate live publish)</option>
            </select>
            <p className="text-[11px] text-gray-500 mt-1">Initial visibility on YouTube</p>
          </div>

          {/* Video Aspect Ratio */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
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
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="16:9">16:9 Landscape (1920x1080 Standard)</option>
              <option value="9:16">9:16 Vertical (1080x1920 Shorts)</option>
            </select>
            <p className="text-[11px] text-gray-500 mt-1">Layout format for FFmpeg</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => handleSaveSettings()}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Save All Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
