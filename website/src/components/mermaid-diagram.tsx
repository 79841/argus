"use client";

import { useEffect, useRef, useState } from "react";

type MermaidDiagramProps = {
  chart: string;
  children?: React.ReactNode;
};

export function MermaidDiagram({ chart, children }: MermaidDiagramProps) {
  const code = chart || (typeof children === "string" ? children : "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    const render = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          fontFamily: "inherit",
        });
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: rendered } = await mermaid.render(id, code.trim());
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <pre className="my-6 overflow-x-auto rounded-lg bg-red-950 p-4 text-sm text-red-300">
        {code}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="my-6 flex items-center justify-center rounded-lg bg-surface-50 p-8 dark:bg-surface-900">
        <span className="text-sm text-surface-400">Loading diagram...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto rounded-lg bg-surface-50 p-6 dark:bg-surface-900 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
