import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Marathi Book-Summary YouTube Agent",
  description: "Autonomous Marathi Book Summary Content Creation & Publishing Studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-[#0B0F19] text-[#E2E8F0] antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
