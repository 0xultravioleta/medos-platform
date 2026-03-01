"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
}

export function CodeBlock({ code, language, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-[var(--medos-gray-200)] overflow-hidden">
      <div className="flex items-center justify-between bg-[#1E293B] px-4 py-2">
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-xs font-medium text-gray-300">{title}</span>
          )}
          <span className="rounded-md bg-gray-700 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
            {language}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-400 transition hover:bg-gray-700 hover:text-gray-200"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="bg-[#0F172A] p-4 overflow-x-auto">
        <code className="text-sm font-mono text-gray-300 leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  );
}
