"use client";

import { useState } from "react";
import { X, Upload, BookPlus, Sparkles, Image as ImageIcon } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111114] border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 text-white shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BookPlus size={16} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Queue a New Book</h2>
              <p className="text-[11px] text-zinc-400 font-mono">Add title for automated Marathi summary generation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/[0.06]"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
              Book Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Atomic Habits, श्रीमंत दगडूशेठ, मृत्युंजय"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
              Author (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. James Clear, शिवाजी सावंत"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Cover Image URL (Optional)
              </label>
              <span className="text-[11px] text-indigo-400 flex items-center gap-1 font-mono">
                <Sparkles className="w-3 h-3" /> Auto-fetched if blank
              </span>
            </div>
            <div className="relative">
              <input
                type="url"
                placeholder="https://... or leave blank for auto-lookup"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              />
              <ImageIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Source Notes / Summary (Optional)
              </label>
              <label className="cursor-pointer text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono">
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
              className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans leading-relaxed"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-mono font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
