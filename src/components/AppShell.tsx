"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import LoginScreen from "./LoginScreen";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/status");
      if (res.ok) {
        const data = await res.json();
        setAuthenticated(data.authenticated);
      } else {
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs text-gray-500">Checking credentials...</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0]">
      <Sidebar />
      <main className="md:pl-60 min-h-screen flex flex-col">
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
