"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building2,
  ArrowLeftRight,
  HeartPulse,
  AlertTriangle,
  Clock,
  Smartphone,
  Search,
  TrendingUp,
  BarChart3,
  BadgeCheck,
  FileOutput,
  Brain,
  Users,
  ChevronLeft,
  PanelLeftOpen,
} from "lucide-react";

/* --- Theoria nav groups --- */
const NAV_GROUPS = [
  {
    label: "Clinical Operations",
    items: [
      { label: "Facility Console", href: "/theoria/facility", icon: Building2 },
      { label: "Shift Handoff", href: "/theoria/shift-handoff", icon: ArrowLeftRight },
      { label: "Post-Acute Guardian", href: "/theoria/guardian", icon: HeartPulse },
      { label: "Readmission Risk", href: "/theoria/readmission", icon: AlertTriangle },
    ],
  },
  {
    label: "Revenue Capture",
    items: [
      { label: "CCM Time Tracker", href: "/theoria/ccm", icon: Clock },
      { label: "RPM Revenue", href: "/theoria/rpm", icon: Smartphone },
      { label: "Care Gap Scanner", href: "/theoria/care-gaps", icon: Search },
    ],
  },
  {
    label: "Data Intelligence",
    items: [
      { label: "Discharge Recon", href: "/theoria/discharge", icon: FileOutput },
      { label: "Care Plan Optimizer", href: "/theoria/care-plans", icon: Brain },
      { label: "Staffing Optimizer", href: "/theoria/staffing", icon: Users },
    ],
  },
  {
    label: "Enterprise & Governance",
    items: [
      { label: "ACO REACH", href: "/theoria/aco-reach", icon: TrendingUp },
      { label: "PE Executive", href: "/theoria/executive", icon: BarChart3 },
      { label: "Credentialing", href: "/theoria/credentialing", icon: BadgeCheck },
    ],
  },
];

export default function TheoriaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(href: string) {
    if (href === "/theoria/facility") {
      return pathname === "/theoria" || pathname === "/theoria/facility";
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 lg:-m-8">
      {/* Theoria sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-[var(--medos-gray-200)] bg-white transition-all duration-200 flex-shrink-0",
          collapsed ? "w-14" : "w-56"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-12 px-3 border-b border-[var(--medos-gray-100)]">
          {!collapsed && (
            <span className="text-xs font-semibold text-[var(--medos-gray-500)] uppercase tracking-wider">
              Theoria Medical
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-[var(--medos-gray-400)] hover:text-[var(--medos-gray-600)] hover:bg-[var(--medos-gray-50)] transition-default"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-2 mb-1 text-[10px] font-semibold text-[var(--medos-gray-400)] uppercase tracking-widest">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md text-xs font-medium transition-default",
                        collapsed
                          ? "justify-center p-2"
                          : "px-2.5 py-2",
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
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</div>
    </div>
  );
}
