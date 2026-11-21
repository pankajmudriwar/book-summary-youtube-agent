"use client";

import { useEffect, useState } from "react";
import type { Book } from "@/lib/types";
import BookRow from "@/components/BookRow";
import AddBookModal from "@/components/AddBookModal";
import BulkAddModal from "@/components/BulkAddModal";
import {
  Plus,
  Layers,
  Filter,
  RefreshCw,
  Search,
  ListVideo,
  Clock,
  CheckCircle2,
  AlertTriangle,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <ListVideo className="w-7 h-7 text-blue-400" />
            <span>Book Queue Manager</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your daily pipeline queue, edit Marathi scripts, and inspect logs
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Single Book</span>
          </button>

          <button
            onClick={() => setBulkModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Bulk Add (30+ Books)</span>
          </button>

          <button
            onClick={loadBooks}
            title="Refresh list"
            className="p-2 rounded-xl bg-[#151C2C] hover:bg-[#1E293B] border border-[#1E293B] text-gray-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-[#151C2C] border border-[#1E293B] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, author, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: "all", label: `All (${books.length})` },
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "published", label: `Published (${publishedCount})` },
            { id: "failed", label: `Failed (${failedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                statusFilter === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-[#0B0F19] text-gray-400 hover:text-white border border-[#1E293B]"
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
          <div className="p-12 text-center text-gray-500 text-sm bg-[#151C2C] rounded-2xl border border-[#1E293B]">
            <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
            <span>Loading books...</span>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm bg-[#151C2C] rounded-2xl border border-[#1E293B]">
            No books found matching the current criteria. Add books above to populate your queue.
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
