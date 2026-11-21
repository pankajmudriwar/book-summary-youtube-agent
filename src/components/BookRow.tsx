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
} from "lucide-react";

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
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to save script:", err);
    } finally {
      setSavingScript(false);
    }
  }

  async function handleRetry() {
    setActionLoading(true);
    try {
      await fetch(`/api/pipeline/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: book.id }),
      });
      onRefresh();
    } catch (err) {
      console.error("Retry failed:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${book.book_title}"?`)) return;
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

  return (
    <div className="border border-[#1E293B] rounded-xl bg-[#151C2C] overflow-hidden transition-all">
      {/* Main Row */}
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
              alt={book.book_title}
              className="w-12 h-16 object-cover rounded-md bg-[#0B0F19] shrink-0 border border-[#1E293B]"
            />
          ) : (
            <div className="w-12 h-16 rounded-md bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-gray-600 text-xs text-center p-1 shrink-0">
              No Cover
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white text-base truncate">
                {book.book_title}
              </h3>
              <StatusBadge status={book.status} />
            </div>

            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {book.author ? `by ${book.author}` : "Author not specified"} • Added{" "}
              {new Date(book.created_at).toLocaleDateString()}
            </p>

            {book.error_message && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1 line-clamp-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{book.error_message}</span>
              </p>
            )}

            {book.youtube_url && (
              <a
                href={book.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-1 font-medium"
              >
                <span>Watch on YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {(book.status === "failed" || book.status === "pending") && (
            <button
              onClick={handleRetry}
              disabled={actionLoading}
              title={book.status === "failed" ? "Retry pipeline" : "Start pipeline"}
              className="p-2 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 text-xs flex items-center gap-1.5 transition-colors"
            >
              {book.status === "failed" ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Run</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleDelete}
            disabled={actionLoading}
            title="Delete from queue"
            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleToggleExpand}
            className="p-2 rounded-lg bg-[#0B0F19] text-gray-300 hover:text-white border border-[#1E293B] text-xs flex items-center gap-1 transition-colors"
          >
            <span>Details</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Details Pane */}
      {expanded && (
        <div className="border-t border-[#1E293B] bg-[#0E1422] p-4 space-y-4">
          {/* Live Pipeline Tracker */}
          <div className="bg-[#151C2C] p-3 rounded-xl border border-[#1E293B]">
            <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
              Pipeline Stage
            </h4>
            <PipelineTracker currentStatus={book.status} />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-[#1E293B] pb-2">
            <button
              onClick={() => handleTabChange("script")}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "script"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-[#151C2C]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Marathi Script</span>
            </button>
            <button
              onClick={() => handleTabChange("logs")}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "logs"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-[#151C2C]"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Pipeline Logs</span>
            </button>
          </div>

          {/* Script Tab */}
          {activeTab === "script" && (
            <div className="space-y-3">
              {book.youtube_title && (
                <div className="text-xs">
                  <span className="text-gray-400 font-semibold">YouTube Title: </span>
                  <span className="text-white font-medium">{book.youtube_title}</span>
                </div>
              )}

              {book.script_marathi ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Narration Script (मराठी)
                    </span>
                    {!editingScript ? (
                      <button
                        onClick={() => setEditingScript(true)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Edit Script
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingScript(false)}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveScript}
                          disabled={savingScript}
                          className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 font-medium"
                        >
                          <Save className="w-3 h-3" />
                          <span>{savingScript ? "Saving..." : "Save Changes"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {editingScript ? (
                    <textarea
                      rows={8}
                      value={scriptText}
                      onChange={(e) => setScriptText(e.target.value)}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3 text-sm text-gray-100 font-serif leading-relaxed focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 text-sm text-gray-200 leading-relaxed font-serif max-h-60 overflow-y-auto whitespace-pre-wrap">
                      {book.script_marathi}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic py-4 text-center">
                  No script generated yet. Will be written automatically when pipeline runs.
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === "logs" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Execution History
                </span>
                <button
                  onClick={fetchLogs}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Refresh Logs
                </button>
              </div>

              {loadingLogs ? (
                <div className="py-6 text-center text-xs text-gray-500">Loading logs...</div>
              ) : logs.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500 italic">
                  No pipeline logs recorded for this book yet.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto font-mono text-xs">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-lg border ${
                        log.level === "error"
                          ? "bg-red-950/20 border-red-500/20 text-red-300"
                          : log.level === "warning"
                          ? "bg-amber-950/20 border-amber-500/20 text-amber-300"
                          : "bg-[#0B0F19] border-[#1E293B] text-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                        <span className="uppercase font-bold text-gray-400">[{log.stage}]</span>
                        <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="leading-snug">{log.message}</p>
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
