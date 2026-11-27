import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Marathi YT Studio — Autonomous Channel Studio",
  description: "Autonomous Marathi Book Summary Content Creation & Publishing Studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-[#09090B] text-zinc-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
