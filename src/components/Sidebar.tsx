"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListVideo,
  Settings,
  Menu,
  X,
} from "lucide-react";
import YoutubeIcon from "./YoutubeIcon";

const navItems = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/queue",    label: "Queue",     icon: ListVideo },
  { href: "/settings", label: "Settings",  icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-[#151C2C] text-gray-400 hover:text-white"
        onClick={() => setOpen(!open)}
        aria-label="Toggle sidebar"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-60 bg-[#0D1117] border-r border-[#1E293B]
          flex flex-col transition-transform duration-200 ease-in-out
          md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo / Title */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#1E293B]">
          <YoutubeIcon className="w-6 h-6 text-red-500 shrink-0" />
          <span className="text-lg font-bold text-white tracking-tight">
            Marathi YT Agent
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-blue-500/15 text-blue-400"
                      : "text-gray-400 hover:bg-[#151C2C] hover:text-gray-200"
                  }
                `}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#1E293B]">
          <p className="text-[11px] text-gray-600">v1.0 · Admin Dashboard</p>
        </div>
      </aside>
    </>
  );
}
