"use client";

import { useState } from "react";
import { X, Layers, AlertCircle, Sparkles } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111114] border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 text-white shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Bulk Add Book Titles</h2>
              <p className="text-[11px] text-zinc-400 font-mono">Queue up to 30+ books for autonomous daily publishing</p>
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
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Book Titles (One per line)
              </label>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-mono font-medium">
                {titles.length} {titles.length === 1 ? "book" : "books"} detected
              </span>
            </div>
            <textarea
              rows={10}
              placeholder={`Atomic Habits\nPsychology of Money\nश्रीमंत योगी\nमृत्युंजय\nश्यामची आई\nThink and Grow Rich\nRich Dad Poor Dad\nइकिगाई`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
            />
            <p className="text-[11px] text-zinc-400 mt-2 font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Paste 30+ titles at once to schedule an entire month of automated daily videos.</span>
            </p>
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
              disabled={loading || titles.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-mono font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Adding {titles.length} books...</span>
                </>
              ) : (
                <span>Add {titles.length} Books to Queue</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
