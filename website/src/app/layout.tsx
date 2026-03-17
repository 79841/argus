import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: {
    default: "Argus — AI Coding Agent Monitor",
    template: "%s | Argus",
  },
  description:
    "Track costs, tokens, and sessions across Claude Code, Codex CLI, and Gemini CLI — all in one local dashboard.",
  openGraph: {
    title: "Argus — AI Coding Agent Monitor",
    description:
      "Unified monitoring dashboard for AI coding agents. Local, private, no auth required.",
    images: ["/screenshots/overview.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
