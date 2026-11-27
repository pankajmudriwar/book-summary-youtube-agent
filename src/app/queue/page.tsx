"use client";

import { useEffect, useState } from "react";
import type { Book } from "@/lib/types";
import BookRow from "@/components/BookRow";
import AddBookModal from "@/components/AddBookModal";
import BulkAddModal from "@/components/BulkAddModal";
import {
  Plus,
  Layers,
  RefreshCw,
  Search,
  ListVideo,
} from "lucide-react";

export default function QueuePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  async function loadBooks() {
    setLoading(true);
    try {
      const url =
        statusFilter && statusFilter !== "all"
          ? `/api/books?status=${statusFilter}`
          : "/api/books";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch (err) {
      console.error("Failed to load queue:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooks();
  }, [statusFilter]);

  const filteredBooks = books.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.book_title.toLowerCase().includes(q) ||
      (b.author && b.author.toLowerCase().includes(q)) ||
      (b.youtube_title && b.youtube_title.toLowerCase().includes(q))
    );
  });

  const pendingCount = books.filter((b) => b.status === "pending").length;
  const publishedCount = books.filter((b) => b.status === "published").length;
  const failedCount = books.filter((b) => b.status === "failed").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Queue & Production
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5 mt-2">
            <ListVideo className="w-7 h-7 text-indigo-400" />
            <span>Book Queue Studio</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Manage your daily pipeline queue, edit Marathi scripts, inspect live logs, and retry failed jobs
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Single Book</span>
          </button>

          <button
            onClick={() => setBulkModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#111114] hover:bg-[#18181D] border border-white/[0.08] hover:border-white/[0.15] text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bulk Add (30+ Books)</span>
          </button>

          <button
            onClick={loadBooks}
            title="Refresh list"
            className="p-2.5 rounded-xl bg-[#111114] hover:bg-[#18181D] border border-white/[0.08] text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, author, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          {[
            { id: "all", label: `All (${books.length})` },
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "published", label: `Published (${publishedCount})` },
            { id: "failed", label: `Failed (${failedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                statusFilter === tab.id
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "bg-[#09090B] text-zinc-400 hover:text-white border border-white/[0.06]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-xs bg-[#111114] rounded-2xl border border-white/[0.08]">
            <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
            <span className="font-mono">Loading queue from Supabase...</span>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs bg-[#111114] rounded-2xl border border-dashed border-white/[0.08] font-mono">
            No books found matching the current criteria. Add books above to populate your publishing queue.
          </div>
        ) : (
          filteredBooks.map((book) => (
            <BookRow key={book.id} book={book} onRefresh={loadBooks} />
          ))
        )}
      </div>

      {/* Modals */}
      <AddBookModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadBooks}
      />
      <BulkAddModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={loadBooks}
      />
    </div>
  );
}
