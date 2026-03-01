"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface ApiEndpointProps {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  requestExample?: string;
  responseExample?: string;
}

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700 border-blue-200",
  POST: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PUT: "bg-amber-100 text-amber-700 border-amber-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
};

export function ApiEndpoint({
  method,
  path,
  description,
  requestExample,
  responseExample,
}: ApiEndpointProps) {
  const [expanded, setExpanded] = useState(false);
  const hasExamples = requestExample || responseExample;

  return (
    <div className="rounded-lg border border-[var(--medos-gray-200)] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => hasExamples && setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left",
          hasExamples && "cursor-pointer hover:bg-[var(--medos-gray-50)] transition-colors"
        )}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide min-w-[60px]",
            METHOD_STYLES[method]
          )}
        >
          {method}
        </span>
        <code className="text-sm font-mono text-[var(--medos-navy)] flex-1">
          {path}
        </code>
        <span className="text-xs text-[var(--medos-gray-500)] hidden sm:block max-w-[300px] truncate">
          {description}
        </span>
        {hasExamples && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[var(--medos-gray-400)] transition-transform duration-200 flex-shrink-0",
              expanded && "rotate-180"
            )}
          />
        )}
      </button>

      <p className="px-4 pb-2 text-sm text-[var(--medos-gray-600)] sm:hidden">
        {description}
      </p>

      {expanded && hasExamples && (
        <div className="border-t border-[var(--medos-gray-100)] bg-[var(--medos-gray-50)] px-4 py-3 space-y-3">
          {requestExample && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--medos-gray-500)] mb-1">
                Request
              </p>
              <pre className="rounded-lg bg-[#1E293B] p-3 text-xs text-gray-300 overflow-x-auto font-mono">
                {requestExample}
              </pre>
            </div>
          )}
          {responseExample && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--medos-gray-500)] mb-1">
                Response
              </p>
              <pre className="rounded-lg bg-[#1E293B] p-3 text-xs text-gray-300 overflow-x-auto font-mono">
                {responseExample}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
