"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Code2,
  Bot,
  Network,
  Shield,
} from "lucide-react";

const DOCS_NAV = [
  { label: "Overview", href: "/docs", icon: BookOpen },
  { label: "API Reference", href: "/docs/api", icon: Code2 },
  { label: "Agent Workflows", href: "/docs/agents", icon: Bot },
  { label: "MCP Protocol", href: "/docs/mcp", icon: Network },
  { label: "Security", href: "/docs/security", icon: Shield },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/docs") return pathname === "/docs";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* Docs sidebar */}
      <nav className="hidden lg:flex flex-col w-56 flex-shrink-0">
        <div className="sticky top-24 space-y-1">
          <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--medos-gray-400)]">
            Documentation
          </p>
          {DOCS_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--medos-primary-light)] text-[var(--medos-primary)]"
                    : "text-[var(--medos-gray-600)] hover:bg-[var(--medos-gray-50)] hover:text-[var(--medos-gray-900)]"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    active
                      ? "text-[var(--medos-primary)]"
                      : "text-[var(--medos-gray-400)]"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile docs nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--medos-gray-200)] bg-white px-2 py-2">
        <div className="flex justify-around">
          {DOCS_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium",
                  active
                    ? "text-[var(--medos-primary)]"
                    : "text-[var(--medos-gray-500)]"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">{children}</div>
    </div>
  );
}
