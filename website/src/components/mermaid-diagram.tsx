"use client";

import { useEffect, useRef, useState } from "react";

type MermaidDiagramProps = {
  chart?: string;
  children?: React.ReactNode;
};

export function MermaidDiagram({ chart, children }: MermaidDiagramProps) {
  const code = chart || (typeof children === "string" ? children : "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!code.trim()) {
      setError("No mermaid code provided");
      return;
    }

    let cancelled = false;
    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

    import("mermaid")
      .then((mod) => {
        if (cancelled) return;
        const mermaid = mod.default;
        mermaid.initialize({
          startOnLoad: false,
          theme:
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "default",
          fontFamily: "inherit",
          securityLevel: "loose",
        });
        return mermaid.render(id, code.trim());
      })
      .then((result) => {
        if (cancelled || !result) return;
        setHtml(result.svg);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <details className="my-6 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
        <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300">
          Diagram failed to render
        </summary>
        <pre className="mt-2 overflow-x-auto text-xs text-red-600 dark:text-red-400">
          {error}
        </pre>
        <pre className="mt-2 overflow-x-auto text-xs text-surface-600 dark:text-surface-400">
          {code}
        </pre>
      </details>
    );
  }

  if (!html) {
    return (
      <div className="my-6 flex items-center justify-center rounded-lg bg-surface-50 p-8 dark:bg-surface-900">
        <div className="flex items-center gap-2 text-sm text-surface-400">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading diagram...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto rounded-lg bg-surface-50 p-6 dark:bg-surface-900 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
