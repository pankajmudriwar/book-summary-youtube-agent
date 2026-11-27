"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { Book, AgentSettings } from "@/lib/types";
import PipelineTracker from "@/components/PipelineTracker";
import StatusBadge from "@/components/StatusBadge";
import AddBookModal from "@/components/AddBookModal";
import BulkAddModal from "@/components/BulkAddModal";
import {
  Play,
  CheckCircle2,
  Clock,
  Activity,
  Plus,
  Layers,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  GitBranch,
  Radio,
  Tv,
} from "lucide-react";
import YoutubeIcon from "@/components/YoutubeIcon";

export default function DashboardPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [triggerMessage, setTriggerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  async function loadData() {
    try {
      const [booksRes, settingsRes] = await Promise.all([
        fetch("/api/books"),
        fetch("/api/settings"),
      ]);

      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setBooks(booksData);
      }
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Active book determination
  const activeBook = useMemo(
    () =>
      books.find((b) =>
        ["researching", "scripted", "voicing", "rendering", "uploading"].includes(
          b.status
        )
      ),
    [books]
  );

  // Dynamic Polling: 5s if active job running, 15s when idle
  useEffect(() => {
    loadData();
    const intervalTime = activeBook ? 5000 : 15000;
    const interval = setInterval(loadData, intervalTime);
    return () => clearInterval(interval);
  }, [activeBook?.id, activeBook?.status]);

  async function handleRunPipelineNow() {
    setTriggering(true);
    setTriggerMessage(null);
    try {
      const res = await fetch("/api/pipeline/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger pipeline");
      }

      setTriggerMessage({
        type: "success",
        text:
          data.message ||
          `Pipeline triggered successfully for "${
            data.book?.book_title || "next book in queue"
          }"`,
      });
      loadData();
    } catch (err: unknown) {
      setTriggerMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error triggering pipeline",
      });
    } finally {
      setTriggering(false);
    }
  }

  async function handleResetJob(bookId: string) {
    setResettingId(bookId);
    try {
      const res = await fetch(`/api/books/${bookId}/reset`, {
        method: "POST",
      });
      if (res.ok) {
        setTriggerMessage({
          type: "success",
          text: "Book reset to pending status. You can now run the pipeline again.",
        });
        loadData();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset book");
      }
    } catch (err: unknown) {
      setTriggerMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to reset job",
      });
    } finally {
      setResettingId(null);
    }
  }

  const publishedBooks = useMemo(
    () => books.filter((b) => b.status === "published"),
    [books]
  );
  const pendingBooks = useMemo(
    () => books.filter((b) => b.status === "pending"),
    [books]
  );

  // Last job status: find the most recently updated non-pending book
  const lastProcessedBook = useMemo(() => {
    const nonPending = books.filter((b) => b.status !== "pending");
    if (nonPending.length === 0) return null;
    return nonPending.reduce((latest, current) =>
      new Date(current.updated_at) > new Date(latest.updated_at)
        ? current
        : latest
    );
  }, [books]);

  const readiness = settings?.readiness;
  const isSetupIncomplete = readiness && !readiness.isReady;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Autonomous Marathi Channel Studio
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Production v1.2
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-2 tracking-tight">
            Production Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Overview of queue, automated pipeline, and published book summaries
          </p>
        </div>

        {/* Action Button Group */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#111114] hover:bg-[#18181D] border border-white/[0.08] hover:border-white/[0.15] text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Book</span>
          </button>

          <button
            onClick={() => setBulkModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#111114] hover:bg-[#18181D] border border-white/[0.08] hover:border-white/[0.15] text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bulk Add</span>
          </button>

          <button
            onClick={handleRunPipelineNow}
            disabled={triggering || pendingBooks.length === 0 || !!activeBook}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-500/35"
          >
            {triggering ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Triggering...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Pipeline Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pre-Flight Warning Banner if Setup Incomplete */}
      {isSetupIncomplete && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-200">
                Studio Setup Incomplete — Automated Publishing Paused
              </h3>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Missing required dependencies:{" "}
                <strong className="text-amber-200">
                  {readiness.missingRequirements.join(", ")}
                </strong>
                . Complete configuration before triggering pipeline.
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold whitespace-nowrap transition-colors self-start sm:self-center"
          >
            Complete Setup in Settings
          </Link>
        </div>
      )}

      {/* Trigger Notifications */}
      {triggerMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-mono ${
            triggerMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/25 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {triggerMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{triggerMessage.text}</span>
          </div>
          <button
            onClick={() => setTriggerMessage(null)}
            className="text-[11px] underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4-Column KPI Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Published */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-white/[0.12] transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Total Published
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight font-mono">
            {publishedBooks.length}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Marathi videos on YouTube channel
          </p>
        </div>

        {/* Pending Queue */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-white/[0.12] transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Pending Queue
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight font-mono">
            {pendingBooks.length}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Books waiting in publishing queue
          </p>
        </div>

        {/* Last Job Status */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-white/[0.12] transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Last Job Status
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {lastProcessedBook ? (
              <StatusBadge status={lastProcessedBook.status} />
            ) : (
              <span className="text-sm font-mono text-zinc-400">No runs yet</span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-2 truncate font-mono">
            {lastProcessedBook?.book_title || "Queue is ready"}
          </p>
        </div>

        {/* Daily Automation */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-white/[0.12] transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Daily Automation
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-semibold text-white tracking-tight mt-1 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                settings?.is_daily_automation_enabled
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                  : "bg-zinc-600"
              }`}
            />
            <span>
              {settings?.is_daily_automation_enabled
                ? "Active (9:30 AM IST)"
                : "Paused"}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            Vercel Cron: 04:00 UTC daily
          </p>
        </div>
      </div>

      {/* Live Pipeline Execution Command Card */}
      <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] shadow-xl relative overflow-hidden">
        {/* Subtle radial ambient glow in background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
            <h2 className="text-lg font-semibold text-white tracking-tight">
              Live Pipeline Execution
            </h2>
            {activeBook && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                ACTIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/pankajmudriwar/book-summary-youtube-agent/actions"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <GitBranch size={13} className="text-indigo-400" />
              <span>GitHub Actions</span>
              <ExternalLink size={11} className="text-zinc-500" />
            </a>

            {lastProcessedBook &&
              ["failed", "researching", "scripted", "voicing", "rendering", "uploading"].includes(
                lastProcessedBook.status
              ) && (
                <button
                  onClick={() => handleResetJob(lastProcessedBook.id)}
                  disabled={resettingId === lastProcessedBook.id}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RotateCcw
                    size={13}
                    className={
                      resettingId === lastProcessedBook.id
                        ? "animate-spin text-amber-400"
                        : "text-zinc-400"
                    }
                  />
                  <span>Reset / Retry Job</span>
                </button>
              )}
          </div>
        </div>

        {/* Active Book or Latest Run Display */}
        {activeBook ? (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-[#09090B] border border-white/[0.08] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {activeBook.cover_image_url ? (
                  <img
                    src={activeBook.cover_image_url}
                    alt={activeBook.book_title}
                    className="w-10 h-14 object-cover rounded-lg border border-white/[0.08] shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded-lg bg-[#18181D] border border-white/[0.08] flex items-center justify-center text-zinc-500 text-[10px] shrink-0 font-mono">
                    Cover
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">
                    {activeBook.book_title}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate">
                    {activeBook.author ? `by ${activeBook.author}` : "Marathi Summary Pipeline"}
                  </p>
                  <span className="text-[10px] font-mono text-indigo-400 mt-1 block">
                    Last state change: {new Date(activeBook.updated_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <StatusBadge status={activeBook.status} size="md" />
            </div>

            <PipelineTracker
              currentStatus={activeBook.status}
              bookId={activeBook.id}
              errorMessage={activeBook.error_message}
            />
          </div>
        ) : lastProcessedBook?.status === "failed" ? (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {lastProcessedBook.cover_image_url ? (
                  <img
                    src={lastProcessedBook.cover_image_url}
                    alt={lastProcessedBook.book_title}
                    className="w-10 h-14 object-cover rounded-lg border border-rose-500/30 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded-lg bg-[#18181D] border border-white/[0.08] flex items-center justify-center text-zinc-500 text-[10px] shrink-0 font-mono">
                    Cover
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">
                    {lastProcessedBook.book_title}
                  </h3>
                  <p className="text-xs text-rose-300 truncate">
                    Execution failed: {lastProcessedBook.error_message || "Unknown error"}
                  </p>
                  <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                    Failed at: {new Date(lastProcessedBook.updated_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <StatusBadge status="failed" size="md" />
            </div>

            <PipelineTracker
              currentStatus="failed"
              bookId={lastProcessedBook.id}
              errorMessage={lastProcessedBook.error_message}
            />
          </div>
        ) : (
          <div className="py-10 text-center text-zinc-500 text-xs border border-dashed border-white/[0.08] rounded-xl flex flex-col items-center justify-center gap-2">
            <Radio className="w-6 h-6 text-zinc-600 mb-1" />
            <span className="font-medium text-zinc-400">
              Pipeline Idle — No book currently in progress
            </span>
            <p className="text-zinc-500 max-w-sm text-center">
              Click &quot;Run Pipeline Now&quot; above to process the next book waiting in queue,
              or wait for daily automation at 04:00 UTC.
            </p>
          </div>
        )}
      </div>

      {/* Recently Published Summaries Grid */}
      <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <YoutubeIcon className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-semibold text-white tracking-tight">
              Recently Published Summaries
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {publishedBooks.length} published total
          </span>
        </div>

        {publishedBooks.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs border border-dashed border-white/[0.08] rounded-xl flex flex-col items-center justify-center gap-2">
            <Tv className="w-7 h-7 text-zinc-600 mb-1" />
            <span className="font-medium text-zinc-400">No published videos yet</span>
            <p className="text-zinc-500 max-w-sm text-center">
              Once the worker completes voice cloning, rendering, and YouTube upload,
              your videos and direct watch links will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publishedBooks.slice(0, 6).map((book) => (
              <div
                key={book.id}
                className="bg-[#09090B] border border-white/[0.08] hover:border-indigo-500/40 rounded-xl p-4 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-start gap-3">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.book_title}
                        className="w-14 h-20 object-cover rounded-lg bg-[#18181D] shrink-0 border border-white/[0.08]"
                      />
                    ) : (
                      <div className="w-14 h-20 rounded-lg bg-[#18181D] border border-white/[0.08] flex items-center justify-center text-zinc-600 text-xs shrink-0 font-mono">
                        Cover
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {book.youtube_video_id ? "YouTube" : "Published"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white text-sm line-clamp-2 leading-snug mt-1 group-hover:text-indigo-300 transition-colors">
                        {book.youtube_title || book.book_title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 truncate">
                        {book.author ? `by ${book.author}` : "Marathi Summary"}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-500 mt-1">
                        {book.published_at
                          ? new Date(book.published_at).toLocaleDateString()
                          : "Published"}
                      </p>
                    </div>
                  </div>

                  {book.youtube_video_id && (
                    <div className="mt-3 aspect-video rounded-lg overflow-hidden bg-black border border-white/[0.08]">
                      <iframe
                        src={`https://www.youtube.com/embed/${book.youtube_video_id}`}
                        title={book.youtube_title || book.book_title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Live on YouTube
                  </span>
                  {book.youtube_url && (
                    <a
                      href={book.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <span>Watch</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddBookModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadData}
      />
      <BulkAddModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
