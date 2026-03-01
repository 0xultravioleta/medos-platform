"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Calendar,
  FileText,
  DollarSign,
  ShieldCheck,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  BookOpen,
  Target,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Appointments", href: "/appointments", icon: Calendar },
  { label: "AI Notes", href: "/ai-notes", icon: FileText },
  { label: "Claims", href: "/claims", icon: DollarSign },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Pilot", href: "/pilot", icon: Target },
  { label: "Docs", href: "/docs", icon: BookOpen },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[var(--medos-gray-100)]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--medos-primary)] text-white font-bold text-sm flex-shrink-0">
          M
        </div>
        <span className="text-base font-semibold tracking-tight text-[var(--medos-navy)]">
          MedOS
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-default group",
                active
                  ? "bg-[var(--medos-primary-light)] text-[var(--medos-primary)]"
                  : "text-[var(--medos-gray-600)] hover:bg-[var(--medos-gray-50)] hover:text-[var(--medos-gray-900)]"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-default",
                  active
                    ? "text-[var(--medos-primary)]"
                    : "text-[var(--medos-gray-400)] group-hover:text-[var(--medos-gray-600)]"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[var(--medos-gray-100)] px-3 py-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--medos-primary-light)] text-[var(--medos-primary)] text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--medos-gray-900)] truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-[var(--medos-gray-500)] truncate capitalize">
              {user?.role || "Staff"}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            setMobileOpen(false);
          }}
          className="flex items-center gap-3 w-full px-3 py-2.5 mt-1 rounded-lg text-sm font-medium text-[var(--medos-gray-600)] hover:bg-[var(--medos-error-light)] hover:text-[var(--medos-error)] transition-default"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-[var(--medos-gray-200)] shadow-medos-sm text-[var(--medos-gray-600)] hover:text-[var(--medos-gray-900)] transition-default"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-[var(--sidebar-width)] bg-white border-r border-[var(--medos-gray-200)] transform transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-md text-[var(--medos-gray-400)] hover:text-[var(--medos-gray-600)] transition-default"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[var(--sidebar-width)] lg:flex-shrink-0 bg-white border-r border-[var(--medos-gray-200)] h-screen sticky top-0">
        {sidebarContent}
      </aside>
    </>
  );
}
