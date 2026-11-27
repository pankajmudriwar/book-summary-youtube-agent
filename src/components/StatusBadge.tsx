"use client";

import type { BookStatus } from "@/lib/types";

const statusConfig: Record<
  BookStatus,
  { bg: string; border: string; text: string; dot: string; label: string; pulse?: boolean }
> = {
  pending: {
    bg: "bg-zinc-800/40",
    border: "border-zinc-700/40",
    text: "text-zinc-400",
    dot: "bg-zinc-500",
    label: "Pending",
  },
  researching: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/25",
    text: "text-indigo-400",
    dot: "bg-indigo-400",
    label: "Researching",
    pulse: true,
  },
  scripted: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    text: "text-blue-400",
    dot: "bg-blue-400",
    label: "Scripted",
    pulse: true,
  },
  voicing: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/25",
    text: "text-purple-400",
    dot: "bg-purple-400",
    label: "Cloning Voice",
    pulse: true,
  },
  rendering: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    text: "text-amber-400",
    dot: "bg-amber-400",
    label: "Rendering Video",
    pulse: true,
  },
  uploading: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    text: "text-amber-400",
    dot: "bg-amber-400",
    label: "Uploading to YouTube",
    pulse: true,
  },
  published: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    label: "Published",
  },
  failed: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/25",
    text: "text-rose-400",
    dot: "bg-rose-500",
    label: "Failed",
  },
};

interface StatusBadgeProps {
  status: BookStatus;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-medium border ${
        config.bg
      } ${config.border} ${config.text} ${
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {config.pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dot}`}
        />
      </span>
      <span>{config.label}</span>
    </span>
  );
}
