"use client";

import { useState } from "react";
import type { Book, PipelineLog } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import PipelineTracker from "./PipelineTracker";
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
  ExternalLink,
  FileText,
  Terminal,
  Save,
  Check,
  AlertTriangle,
  Play,
  Volume2,
  FileCode,
} from "lucide-react";
import YoutubeIcon from "./YoutubeIcon";

interface BookRowProps {
  book: Book;
  onRefresh: () => void;
}

export default function BookRow({ book, onRefresh }: BookRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"script" | "logs">("script");
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editingScript, setEditingScript] = useState(false);
  const [scriptText, setScriptText] = useState(book.script_marathi || "");
  const [savingScript, setSavingScript] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/pipeline/logs/${book.id}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  }

  function handleToggleExpand() {
    if (!expanded && activeTab === "logs" && logs.length === 0) {
      fetchLogs();
    }
    setExpanded(!expanded);
  }

  function handleTabChange(tab: "script" | "logs") {
    setActiveTab(tab);
    if (tab === "logs" && logs.length === 0) {
      fetchLogs();
    }
  }

  async function handleSaveScript() {
    setSavingScript(true);
    try {
      const res = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script_marathi: scriptText }),
      });
      if (res.ok) {
        setEditingScript(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to save script:", err);
    } finally {
      setSavingScript(false);
    }
  }

  async function handleRunOrRetry() {
    setActionLoading(true);
    try {
      // If failed, reset first then trigger
      if (book.status === "failed") {
        await fetch(`/api/books/${book.id}/reset`, { method: "POST" });
      }

      await fetch(`/api/pipeline/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: book.id }),
      });
      onRefresh();
    } catch (err) {
      console.error("Pipeline trigger failed:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetToPending() {
    setActionLoading(true);
    try {
      await fetch(`/api/books/${book.id}/reset`, { method: "POST" });
      onRefresh();
    } catch (err) {
      console.error("Reset failed:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${book.book_title}" from queue?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setActionLoading(false);
    }
  }

  const isFailed = book.status === "failed";
  const isPending = book.status === "pending";
  const isActive = ["researching", "scripted", "voicing", "rendering", "uploading"].includes(
    book.status
  );

  return (
    <div className="border border-white/[0.08] hover:border-white/[0.14] rounded-2xl bg-[#111114] overflow-hidden transition-all shadow-sm">
      {/* Main Row Header */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
              alt={book.book_title}
              className="w-12 h-16 object-cover rounded-xl bg-[#09090B] shrink-0 border border-white/[0.08] shadow-inner"
            />
          ) : (
            <div className="w-12 h-16 rounded-xl bg-[#18181D] border border-white/[0.08] flex items-center justify-center text-zinc-500 text-[10px] text-center p-1 shrink-0 font-mono">
              No Cover
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-semibold text-white text-sm sm:text-base truncate">
                {book.book_title}
              </h3>
              <StatusBadge status={book.status} />
            </div>

            <p className="text-xs text-zinc-400 mt-1 truncate">
              {book.author ? `by ${book.author}` : "Author not specified"} • Added{" "}
              {new Date(book.created_at).toLocaleDateString()}
            </p>

            {book.error_message && (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1.5 line-clamp-1 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span className="truncate">{book.error_message}</span>
              </p>
            )}

            {/* Quick Media Links */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {book.youtube_url && (
                <a
                  href={book.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium font-mono"
                >
                  <YoutubeIcon className="w-3.5 h-3.5 text-rose-500" />
                  <span>Watch on YouTube</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              )}
              {book.audio_url && (
                <a
                  href={book.audio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 font-mono"
                >
                  <Volume2 size={12} className="text-purple-400" />
                  <span>Narration Audio</span>
                </a>
              )}
              {book.subtitle_url && (
                <a
                  href={book.subtitle_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 font-mono"
                >
                  <FileCode size={12} className="text-blue-400" />
                  <span>ASS Subtitles</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action Button Group */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {/* Run / Retry */}
          {(isFailed || isPending) && (
            <button
              onClick={handleRunOrRetry}
              disabled={actionLoading}
              title={isFailed ? "Reset and retry pipeline" : "Start pipeline now"}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 text-xs font-mono font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isFailed ? (
                <>
                  <RotateCcw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
                  <span>Retry</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run</span>
                </>
              )}
            </button>
          )}

          {/* Reset button for active/stuck job */}
          {isActive && (
            <button
              onClick={handleResetToPending}
              disabled={actionLoading}
              title="Reset stuck job back to pending"
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 text-xs font-mono flex items-center gap-1 transition-all"
            >
              <RotateCcw size={12} className={actionLoading ? "animate-spin" : ""} />
              <span>Reset</span>
            </button>
          )}

          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={actionLoading}
            title="Delete from queue"
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Expand Details Drawer */}
          <button
            onClick={handleToggleExpand}
            className="px-3 py-1.5 rounded-xl bg-[#09090B] hover:bg-[#18181D] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <span>{expanded ? "Hide" : "Inspect"}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Details Pane */}
      {expanded && (
        <div className="border-t border-white/[0.08] bg-[#0c0c0e] p-5 space-y-5 animate-fade-in">
          {/* Stepper & Logs */}
          <div className="bg-[#111114] p-4 rounded-xl border border-white/[0.08]">
            <h4 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">
              Pipeline Stage & Live Execution
            </h4>
            <PipelineTracker
              currentStatus={book.status}
              bookId={book.id}
              errorMessage={book.error_message}
            />
          </div>

          {/* Tabs: Marathi Script vs Pipeline Logs */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
            <button
              onClick={() => handleTabChange("script")}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all ${
                activeTab === "script"
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Marathi Script</span>
            </button>
            <button
              onClick={() => handleTabChange("logs")}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all ${
                activeTab === "logs"
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Full Execution Logs</span>
            </button>
          </div>

          {/* Script Tab */}
          {activeTab === "script" && (
            <div className="space-y-3">
              {book.youtube_title && (
                <div className="p-3 rounded-xl bg-[#09090B] border border-white/[0.06] text-xs">
                  <span className="text-zinc-400 font-semibold">YouTube Title: </span>
                  <span className="text-white font-medium">{book.youtube_title}</span>
                </div>
              )}

              {book.script_marathi ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                      Narration Script (मराठी) • {book.script_marathi.length} chars
                    </span>
                    {!editingScript ? (
                      <div className="flex items-center gap-2">
                        {saveSuccess && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                            <Check size={12} /> Saved
                          </span>
                        )}
                        <button
                          onClick={() => setEditingScript(true)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Edit Script
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingScript(false)}
                          className="text-xs text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveScript}
                          disabled={savingScript}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs flex items-center gap-1 font-mono"
                        >
                          <Save className="w-3 h-3" />
                          <span>{savingScript ? "Saving..." : "Save Changes"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {editingScript ? (
                    <textarea
                      rows={10}
                      value={scriptText}
                      onChange={(e) => setScriptText(e.target.value)}
                      className="w-full bg-[#09090B] border border-white/[0.12] rounded-xl p-4 text-sm text-zinc-100 font-sans leading-relaxed focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  ) : (
                    <div className="bg-[#09090B] border border-white/[0.06] rounded-xl p-4 text-sm text-zinc-200 leading-relaxed font-sans max-h-72 overflow-y-auto whitespace-pre-wrap">
                      {book.script_marathi}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 italic py-6 text-center border border-dashed border-white/[0.08] rounded-xl font-mono">
                  No Marathi script generated yet. Gemini AI will research and compose the script when the pipeline runs.
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === "logs" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                  Execution History
                </span>
                <button
                  onClick={fetchLogs}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
                >
                  Refresh Logs
                </button>
              </div>

              {loadingLogs ? (
                <div className="py-6 text-center text-xs text-zinc-500 font-mono">Loading logs...</div>
              ) : logs.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 italic font-mono border border-dashed border-white/[0.08] rounded-xl">
                  No pipeline logs recorded for this book yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-xs">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl border ${
                        log.level === "error"
                          ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
                          : log.level === "warning"
                          ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
                          : "bg-[#09090B] border-white/[0.06] text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                        <span className="uppercase font-bold text-zinc-400">[{log.stage}]</span>
                        <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="leading-snug text-xs">{log.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
