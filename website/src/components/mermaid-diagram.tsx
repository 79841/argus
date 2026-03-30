"use client";

import { useEffect, useRef, useState } from "react";

type MermaidDiagramProps = {
  code: string;
};

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        fontFamily: "inherit",
      });
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      const { svg: rendered } = await mermaid.render(id, code);
      if (!cancelled) setSvg(rendered);
    };

    render().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [code]);

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
