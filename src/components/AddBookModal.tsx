"use client";

import { useState } from "react";
import { X, Upload, BookPlus, Sparkles, FileText, Image as ImageIcon } from "lucide-react";

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddBookModal({ isOpen, onClose, onSuccess }: AddBookModalProps) {
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const text = await file.text();
      setSourceText(text);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bookTitle.trim()) {
      setError("Book title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_title: bookTitle.trim(),
          author: author.trim() || null,
          cover_image_url: coverImageUrl.trim() || null,
          source_text: sourceText.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add book");
      }

      setBookTitle("");
      setAuthor("");
      setCoverImageUrl("");
      setSourceText("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error adding book");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#151C2C] border border-[#1E293B] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <BookPlus className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Queue a New Book</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Book Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Atomic Habits, श्रीमंत दगडूशेठ, मृत्युंजय"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Author (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. James Clear, शिवाजी सावंत"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Cover Image URL (Optional)
              </label>
              <span className="text-[11px] text-blue-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-fetched if blank
              </span>
            </div>
            <div className="relative">
              <input
                type="url"
                placeholder="https://... or leave blank for auto-lookup"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
              <ImageIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Source Notes / Summary (Optional)
              </label>
              <label className="cursor-pointer text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <Upload className="w-3 h-3" /> Upload .txt / .md
                <input
                  type="file"
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              rows={4}
              placeholder="Paste book chapters, summary notes, or key lessons here. If left blank, Gemini with Google Search will research it automatically."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-[#1E293B] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add to Queue</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
