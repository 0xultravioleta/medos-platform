"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            primaryColor: "#EFF6FF",
            primaryTextColor: "#0F172A",
            primaryBorderColor: "#0066FF",
            lineColor: "#94A3B8",
            secondaryColor: "#F0FDF4",
            tertiaryColor: "#FFF7ED",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "14px",
          },
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
          setLoading(false);
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (error) {
    return (
      <div className={`rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 ${className ?? ""}`}>
        Failed to render diagram: {error}
      </div>
    );
  }

  return (
    <div className={className}>
      {loading && (
        <div className="flex items-center justify-center h-48 rounded-xl border border-[var(--medos-gray-200)] bg-[var(--medos-gray-50)]">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--medos-primary)] border-t-transparent animate-spin" />
            <span className="text-sm text-[var(--medos-gray-500)]">Rendering diagram...</span>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className={`overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full ${loading ? "hidden" : ""}`}
      />
    </div>
  );
}
