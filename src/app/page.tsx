"use client";

import { useEffect, useState } from "react";
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
  BookOpen,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import YoutubeIcon from "@/components/YoutubeIcon";

export default function DashboardPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
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

  useEffect(() => {
    loadData();
    // Poll every 15s to update live pipeline state
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

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
        text: data.message || `Pipeline dispatched for "${data.book?.book_title || "next book"}"`,
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

  const publishedBooks = books.filter((b) => b.status === "published");
  const pendingBooks = books.filter((b) => b.status === "pending");
  const activeBook = books.find((b) =>
    ["researching", "scripted", "voicing", "rendering", "uploading"].includes(
      b.status
    )
  );
  const latestFinishedBook = books.find((b) =>
    ["published", "failed"].includes(b.status)
  );

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Autonomous Marathi Channel Studio
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-1.5 tracking-tight">
            Production Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Overview of queue, automated pipeline, and published book summaries
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#151C2C] hover:bg-[#1E293B] border border-[#1E293B] text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>Add Book</span>
          </button>

          <button
            onClick={() => setBulkModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#151C2C] hover:bg-[#1E293B] border border-[#1E293B] text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bulk Add</span>
          </button>

          <button
            onClick={handleRunPipelineNow}
            disabled={triggering || pendingBooks.length === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {triggerMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
            triggerMessage.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {triggerMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{triggerMessage.text}</span>
          </div>
          <button
            onClick={() => setTriggerMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Published */}
        <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#1E293B]">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Published
            </span>
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {publishedBooks.length}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Marathi videos on YouTube channel
          </p>
        </div>

        {/* Pending Queue */}
        <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#1E293B]">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending Queue
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {pendingBooks.length}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Books waiting in publishing queue
          </p>
        </div>

        {/* Last Run Status */}
        <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#1E293B]">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Last Job Status
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {latestFinishedBook ? (
              <StatusBadge status={latestFinishedBook.status} />
            ) : (
              <span className="text-sm text-gray-400">No runs yet</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2 truncate">
            {latestFinishedBook?.book_title || "Queue is ready"}
          </p>
        </div>

        {/* Next Scheduled Run */}
        <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#1E293B]">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Daily Automation
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                settings?.is_daily_automation_enabled ? "bg-green-400" : "bg-gray-500"
              }`}
            />
            <span>
              {settings?.is_daily_automation_enabled ? "Active (9:30 AM IST)" : "Paused"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Vercel Cron: 04:00 UTC daily
          </p>
        </div>
      </div>

      {/* Live Pipeline Tracker Card (Active Job) */}
      <div className="p-6 rounded-2xl bg-[#151C2C] border border-[#1E293B] shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
            <h2 className="text-lg font-semibold text-white">Live Pipeline Execution</h2>
          </div>
          {activeBook ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 font-medium">
              Processing: {activeBook.book_title}
            </span>
          ) : (
            <span className="text-xs text-gray-500">Pipeline Idle</span>
          )}
        </div>

        {activeBook ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
              <PipelineTracker currentStatus={activeBook.status} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>
                Book: <strong className="text-white">{activeBook.book_title}</strong>{" "}
                {activeBook.author ? `by ${activeBook.author}` : ""}
              </span>
              <span>Updated: {new Date(activeBook.updated_at).toLocaleTimeString()}</span>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 text-sm border border-dashed border-[#1E293B] rounded-xl">
            No pipeline job is currently executing. Click &quot;Run Pipeline Now&quot; above to
            process the next queued book immediately.
          </div>
        )}
      </div>

      {/* Recent Published Videos */}
      <div className="p-6 rounded-2xl bg-[#151C2C] border border-[#1E293B]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <YoutubeIcon className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-white">
              Recently Published Summaries
            </h2>
          </div>
          <span className="text-xs text-gray-400">
            {publishedBooks.length} published total
          </span>
        </div>

        {publishedBooks.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm border border-dashed border-[#1E293B] rounded-xl">
            No published videos yet. Once the worker renders and uploads to YouTube,
            your videos and direct YouTube watch links will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publishedBooks.slice(0, 6).map((book) => (
              <div
                key={book.id}
                className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between hover:border-blue-500/40 transition-colors"
              >
                <div>
                  <div className="flex items-start gap-3">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.book_title}
                        className="w-14 h-20 object-cover rounded-lg bg-[#151C2C] shrink-0 border border-[#1E293B]"
                      />
                    ) : (
                      <div className="w-14 h-20 rounded-lg bg-[#151C2C] border border-[#1E293B] flex items-center justify-center text-gray-600 text-xs shrink-0">
                        Cover
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white text-sm line-clamp-2 leading-snug">
                        {book.youtube_title || book.book_title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {book.author ? `by ${book.author}` : "Marathi Summary"}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        {book.published_at
                          ? new Date(book.published_at).toLocaleDateString()
                          : "Published"}
                      </p>
                    </div>
                  </div>

                  {book.youtube_video_id && (
                    <div className="mt-3 aspect-video rounded-lg overflow-hidden bg-black border border-[#1E293B]">
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

                <div className="mt-3 pt-3 border-t border-[#1E293B] flex items-center justify-between">
                  <span className="text-[11px] text-green-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Live on YouTube
                  </span>
                  {book.youtube_url && (
                    <a
                      href={book.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <span>Open</span>
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
