"use client";

import { useEffect, useState } from "react";
import type { BookStatus, PipelineLog } from "@/lib/types";
import {
  Search,
  FileText,
  Mic,
  Film,
  Upload,
  CheckCircle2,
  AlertCircle,
  Terminal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

const stages: { key: BookStatus; label: string; icon: React.ElementType }[] = [
  { key: "researching", label: "Research", icon: Search },
  { key: "scripted", label: "Script", icon: FileText },
  { key: "voicing", label: "Voice", icon: Mic },
  { key: "rendering", label: "Render", icon: Film },
  { key: "uploading", label: "Upload", icon: Upload },
  { key: "published", label: "Published", icon: CheckCircle2 },
];

const statusOrder: Record<string, number> = {
  pending: 0,
  researching: 1,
  scripted: 2,
  voicing: 3,
  rendering: 4,
  uploading: 5,
  published: 6,
  failed: -1,
};

interface PipelineTrackerProps {
  currentStatus: BookStatus;
  bookId?: string;
  errorMessage?: string | null;
  lastStageAtFailure?: string | null;
}

export default function PipelineTracker({
  currentStatus,
  bookId,
  errorMessage,
  lastStageAtFailure,
}: PipelineTrackerProps) {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const isFailed = currentStatus === "failed";
  const isActive = [
    "researching",
    "scripted",
    "voicing",
    "rendering",
    "uploading",
  ].includes(currentStatus);

  const currentIndex = statusOrder[currentStatus] ?? 0;

  async function fetchLogs() {
    if (!bookId) return;
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/pipeline/logs/${bookId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  }

  // Auto-fetch logs on mount or if active
  useEffect(() => {
    if (bookId) {
      fetchLogs();
    }
  }, [bookId, currentStatus]);

  // Periodic polling if currently executing
  useEffect(() => {
    if (!bookId || !isActive) return;
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, [bookId, isActive]);

  return (
    <div className="space-y-4">
      {/* 6-Step Visual Stepper */}
      <div className="relative py-2">
        <div className="flex items-center justify-between w-full relative z-10 overflow-x-auto pb-2 scrollbar-none">
          {stages.map((stage, i) => {
            const stageIndex = statusOrder[stage.key];
            const isCompleted =
              (!isFailed && currentIndex > stageIndex) ||
              currentStatus === "published";
            const isCurrent = !isFailed && currentIndex === stageIndex;
            const isFailedHere =
              isFailed &&
              (lastStageAtFailure === stage.key ||
                (stageIndex === 1 && !lastStageAtFailure));
            const isUpcoming =
              !isCompleted && !isCurrent && !isFailedHere;

            const Icon = stage.icon;

            return (
              <div
                key={stage.key}
                className="flex items-center flex-1 last:flex-none min-w-[90px]"
              >
                {/* Node */}
                <div className="flex flex-col items-center gap-2 w-full text-center group">
                  <div
                    className={`
                      w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 border
                      ${
                        isCompleted
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10"
                          : ""
                      }
                      ${
                        isCurrent
                          ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 ring-4 ring-indigo-500/20 shadow-md shadow-indigo-500/20 animate-pulse"
                          : ""
                      }
                      ${
                        isFailedHere
                          ? "bg-rose-500/20 border-rose-500 text-rose-400 ring-2 ring-rose-500/20"
                          : ""
                      }
                      ${
                        isUpcoming
                          ? "bg-[#18181D] border-white/[0.08] text-zinc-600"
                          : ""
                      }
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={17} className="text-emerald-400" />
                    ) : isFailedHere ? (
                      <AlertCircle size={17} className="text-rose-400" />
                    ) : (
                      <Icon size={16} />
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-medium tracking-tight ${
                      isCompleted
                        ? "text-emerald-400"
                        : isCurrent
                        ? "text-indigo-300 font-semibold"
                        : isFailedHere
                        ? "text-rose-400 font-semibold"
                        : "text-zinc-500"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>

                {/* Connecting Bar */}
                {i < stages.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 mx-2 -mt-5 transition-colors duration-300 ${
                      isCompleted
                        ? "bg-emerald-500/40"
                        : isCurrent
                        ? "bg-gradient-to-r from-indigo-500 to-zinc-800"
                        : "bg-white/[0.06]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Callout if Failed */}
      {isFailed && errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-rose-200">Execution Error:</span>
            <p className="font-mono text-[11px] text-rose-300/90 leading-relaxed whitespace-pre-wrap">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Collapsible Live Execution Console */}
      {bookId && (
        <div className="border border-white/[0.08] rounded-xl bg-black/40 overflow-hidden">
          <button
            onClick={() => {
              if (!consoleOpen && logs.length === 0) fetchLogs();
              setConsoleOpen(!consoleOpen);
            }}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-indigo-400" />
              <span className="font-mono font-medium">Live Execution Console</span>
              {logs.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/[0.06] text-zinc-300">
                  {logs.length} logs
                </span>
              )}
              {isActive && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Streaming
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  fetchLogs();
                }}
                title="Refresh logs"
                className="p-1 hover:text-white transition-colors"
              >
                <RefreshCw
                  size={12}
                  className={loadingLogs ? "animate-spin text-indigo-400" : ""}
                />
              </span>
              {consoleOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {consoleOpen && (
            <div className="p-3 bg-black/60 font-mono text-[11px] max-h-56 overflow-y-auto space-y-1 border-t border-white/[0.06]">
              {logs.length === 0 ? (
                <div className="text-zinc-500 py-3 text-center italic">
                  No log entries recorded yet for this book.
                </div>
              ) : (
                logs.map((log) => {
                  let time = "Just now";
                  try {
                    if (log.created_at) {
                      const d = new Date(log.created_at);
                      if (!isNaN(d.getTime())) time = d.toLocaleTimeString();
                    }
                  } catch {
                    // ignore
                  }
                  const isErr = log.level === "error";
                  const isWarn = log.level === "warning";

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-2 leading-relaxed"
                    >
                      <span className="text-zinc-600 shrink-0 select-none">
                        [{time}]
                      </span>
                      <span
                        className={`uppercase font-semibold text-[10px] shrink-0 ${
                          isErr
                            ? "text-rose-400"
                            : isWarn
                            ? "text-amber-400"
                            : "text-indigo-400"
                        }`}
                      >
                        [{log.stage}]
                      </span>
                      <span
                        className={`break-all ${
                          isErr
                            ? "text-rose-300"
                            : isWarn
                            ? "text-amber-200"
                            : "text-zinc-300"
                        }`}
                      >
                        {log.message}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
