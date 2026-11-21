"use client";

import { useState } from "react";
import { X, Layers, AlertCircle, CheckCircle2 } from "lucide-react";

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkAddModal({ isOpen, onClose, onSuccess }: BulkAddModalProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const titles = text
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (titles.length === 0) {
      setError("Please enter at least one book title");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/books/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add books");
      }

      setText("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error bulk-adding books");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#151C2C] border border-[#1E293B] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold">Bulk Add Book Titles</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Book Titles (One per line)
              </label>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
                {titles.length} {titles.length === 1 ? "book" : "books"} detected
              </span>
            </div>
            <textarea
              rows={10}
              placeholder={`Atomic Habits\nPsychology of Money\nश्रीमंत योगी\nमृत्युंजय\nश्यामची आई\nThink and Grow Rich\nRich Dad Poor Dad\nइकिगाई`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="text-xs text-gray-400 mt-2">
              Paste 30+ titles at once to schedule an entire month of automated daily videos.
            </p>
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
              disabled={loading || titles.length === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Adding {titles.length} books...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Add {titles.length} to Queue</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
