"use client";

import type { BookStatus } from "@/lib/types";
import {
  Search,
  FileText,
  Mic,
  Subtitles,
  Film,
  Upload,
  CheckCircle2,
} from "lucide-react";

const stages: { key: BookStatus; label: string; icon: React.ElementType }[] = [
  { key: "researching", label: "Research",  icon: Search },
  { key: "scripted",    label: "Script",    icon: FileText },
  { key: "voicing",     label: "Voice",     icon: Mic },
  // "captions" is not a BookStatus, it falls between voicing and rendering
  { key: "rendering",   label: "Render",    icon: Film },
  { key: "uploading",   label: "Upload",    icon: Upload },
  { key: "published",   label: "Published", icon: CheckCircle2 },
];

const statusOrder: Record<string, number> = {
  pending: 0,
  researching: 1,
  scripted: 2,
  voicing: 3,
  rendering: 4,
  uploading: 5,
  published: 6,
  failed: -1,
};

interface PipelineTrackerProps {
  currentStatus: BookStatus;
}

export default function PipelineTracker({ currentStatus }: PipelineTrackerProps) {
  const currentIndex = statusOrder[currentStatus] ?? 0;
  const isFailed = currentStatus === "failed";

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {stages.map((stage, i) => {
        const stageIndex = statusOrder[stage.key];
        const isCompleted = !isFailed && currentIndex > stageIndex;
        const isCurrent = !isFailed && currentIndex === stageIndex;
        const isUpcoming = isFailed || currentIndex < stageIndex;

        const Icon = stage.icon;

        return (
          <div key={stage.key} className="flex items-center">
            {/* Stage dot + label */}
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all
                  ${isCompleted ? "bg-green-500/30 text-green-400" : ""}
                  ${isCurrent ? "bg-blue-500/30 text-blue-400 animate-pulse-dot ring-2 ring-blue-500/50" : ""}
                  ${isUpcoming ? "bg-[#1E293B] text-gray-600" : ""}
                  ${isFailed && currentIndex === stageIndex ? "bg-red-500/30 text-red-400" : ""}
                `}
              >
                <Icon size={16} />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isCompleted
                    ? "text-green-400"
                    : isCurrent
                    ? "text-blue-400"
                    : "text-gray-600"
                }`}
              >
                {stage.label}
              </span>
            </div>

            {/* Connector line */}
            {i < stages.length - 1 && (
              <div
                className={`h-0.5 w-6 mt-[-16px] ${
                  isCompleted ? "bg-green-500/50" : "bg-[#1E293B]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
