import type { Metadata } from "next";
import "./globals.css";
import { initializeTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "TriageRAG - Private Incident & Support Resolution Copilot",
  description: "Private AI incident and support resolution copilot using Next.js, pgvector, and local Ollama.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initializeTheme }} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans">{children}</body>
    </html>
  );
}
