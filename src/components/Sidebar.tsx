"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListVideo,
  Settings,
  Menu,
  X,
  ExternalLink,
  Smartphone,
} from "lucide-react";
import YoutubeIcon from "./YoutubeIcon";
import type { SystemReadiness } from "@/lib/types";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/queue", label: "Book Queue", icon: ListVideo },
  { href: "/settings", label: "Studio Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [readiness, setReadiness] = useState<SystemReadiness | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(true);

  async function fetchReadiness() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.readiness) {
          setReadiness(data.readiness);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingReadiness(false);
    }
  }

  useEffect(() => {
    fetchReadiness();
    const timer = setInterval(fetchReadiness, 20000);
    return () => clearInterval(timer);
  }, [pathname]);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2.5 rounded-xl bg-[#111114] border border-white/[0.08] text-zinc-400 hover:text-white shadow-lg"
        onClick={() => setOpen(!open)}
        aria-label="Toggle sidebar"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-[260px] bg-[#111114] border-r border-white/[0.08]
          flex flex-col justify-between transition-transform duration-200 ease-in-out
          md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Top Section */}
        <div className="flex flex-col">
          {/* Studio Brand */}
          <div className="px-5 py-5 border-b border-white/[0.08] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500/20 via-indigo-500/20 to-indigo-500/30 border border-white/[0.1] flex items-center justify-center shadow-inner">
              <YoutubeIcon className="w-5 h-5 text-rose-500 shrink-0" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white tracking-tight leading-none">
                Marathi YT Studio
              </span>
              <span className="text-[10px] text-zinc-400 font-mono mt-1">
                Autonomous Pipeline
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 py-4 space-y-1.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`
                    flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all
                    ${
                      isActive
                        ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 shadow-sm shadow-indigo-500/10"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent"
                    }
                  `}
                >
                  <Icon
                    size={17}
                    className={isActive ? "text-indigo-400" : "text-zinc-400"}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System Readiness Checklist Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#0c0c0e]/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              System Readiness
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                readiness?.isReady
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
          </div>

          <div className="space-y-1.5 text-[11px] font-mono">
            {/* Supabase status */}
            <div className="flex items-center justify-between py-0.5 text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    !loadingReadiness ? "bg-emerald-400" : "bg-zinc-600"
                  }`}
                />
                Supabase DB
              </span>
              <span className="text-[10px] text-zinc-400">
                {!loadingReadiness ? "OK" : "..."}
              </span>
            </div>

            {/* YouTube Auth status */}
            <div className="flex items-center justify-between py-0.5 text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    readiness?.checks?.youtubeConnected || readiness?.details?.youtube
                      ? "bg-emerald-400"
                      : "bg-rose-500"
                  }`}
                />
                YouTube Auth
              </span>
              <span
                className={`text-[10px] ${
                  readiness?.checks?.youtubeConnected || readiness?.details?.youtube
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {readiness?.checks?.youtubeConnected || readiness?.details?.youtube
                  ? "Connected"
                  : "Needed"}
              </span>
            </div>

            {/* Voice Sample status */}
            <div className="flex items-center justify-between py-0.5 text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    readiness?.checks?.voiceSample || readiness?.details?.voiceSample
                      ? "bg-emerald-400"
                      : "bg-amber-400"
                  }`}
                />
                Voice Sample
              </span>
              <span
                className={`text-[10px] ${
                  readiness?.checks?.voiceSample || readiness?.details?.voiceSample
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {readiness?.checks?.voiceSample || readiness?.details?.voiceSample
                  ? "Ready"
                  : "Missing"}
              </span>
            </div>

            {/* Daily Cron status */}
            <div className="flex items-center justify-between py-0.5 text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    readiness?.checks?.cronEnabled || readiness?.details?.cronEnabled
                      ? "bg-emerald-400"
                      : "bg-zinc-600"
                  }`}
                />
                04:00 UTC Cron
              </span>
              <span
                className={`text-[10px] ${
                  readiness?.checks?.cronEnabled || readiness?.details?.cronEnabled
                    ? "text-emerald-400"
                    : "text-zinc-500"
                }`}
              >
                {readiness?.checks?.cronEnabled || readiness?.details?.cronEnabled
                  ? "Active"
                  : "Paused"}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.04] space-y-2 text-[10px] text-zinc-400">
            <div className="flex items-center justify-between">
              <span>Studio v1.2</span>
              <Link
                href="/settings"
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
              >
                <span>Setup</span>
                <ExternalLink size={10} />
              </Link>
            </div>

            <a
              href="/marathi-studio.apk"
              download="marathi-studio.apk"
              className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-zinc-300 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Smartphone size={12} className="text-emerald-400" />
                <span>Android App</span>
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                APK
              </span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
