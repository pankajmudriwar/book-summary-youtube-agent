"use client";

import type { BookStatus } from "@/lib/types";

const statusConfig: Record<BookStatus, { bg: string; text: string; label: string }> = {
  pending:     { bg: "bg-gray-500/20",   text: "text-gray-400",   label: "Pending" },
  researching: { bg: "bg-blue-500/20",   text: "text-blue-400",   label: "Researching" },
  scripted:    { bg: "bg-indigo-500/20", text: "text-indigo-400", label: "Scripted" },
  voicing:     { bg: "bg-purple-500/20", text: "text-purple-400", label: "Voicing" },
  rendering:   { bg: "bg-orange-500/20", text: "text-orange-400", label: "Rendering" },
  uploading:   { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Uploading" },
  published:   { bg: "bg-green-500/20",  text: "text-green-400",  label: "Published" },
  failed:      { bg: "bg-red-500/20",    text: "text-red-400",    label: "Failed" },
};

interface StatusBadgeProps {
  status: BookStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
