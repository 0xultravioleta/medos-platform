"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Search, Bell, ChevronDown, LogOut, User, Building2 } from "lucide-react";

export function TopBar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-[var(--medos-gray-200)] bg-white flex items-center justify-between px-6 lg:px-8 sticky top-0 z-30">
      {/* Left - Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)]" />
          <input
            type="text"
            placeholder="Search patients, notes, claims..."
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-[var(--medos-gray-50)] border border-[var(--medos-gray-200)] text-sm text-[var(--medos-gray-900)] placeholder:text-[var(--medos-gray-400)] transition-default focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent focus:bg-white"
          />
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3 ml-4">
        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg text-[var(--medos-gray-500)] hover:bg-[var(--medos-gray-50)] hover:text-[var(--medos-gray-700)] transition-default"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full bg-[var(--medos-error)] text-white text-[10px] font-bold leading-none">
            3
          </span>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-[var(--medos-gray-200)]" />

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-[var(--medos-gray-50)] transition-default"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--medos-primary-light)] text-[var(--medos-primary)] text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-[var(--medos-gray-900)] leading-tight">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-[var(--medos-gray-500)] leading-tight capitalize">
                {user?.role || "Staff"}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-[var(--medos-gray-400)] hidden sm:block" />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white border border-[var(--medos-gray-200)] shadow-medos-lg py-1 z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-[var(--medos-gray-100)]">
                <p className="text-sm font-semibold text-[var(--medos-gray-900)]">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-[var(--medos-gray-500)] mt-0.5">
                  {user?.email || "user@example.com"}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--medos-gray-600)]">
                  <User className="w-4 h-4 text-[var(--medos-gray-400)]" />
                  <div>
                    <span className="block text-xs text-[var(--medos-gray-400)]">Role</span>
                    <span className="capitalize">{user?.role || "Staff"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--medos-gray-600)]">
                  <Building2 className="w-4 h-4 text-[var(--medos-gray-400)]" />
                  <div>
                    <span className="block text-xs text-[var(--medos-gray-400)]">Organization</span>
                    <span>{user?.tenant || "Clinic"}</span>
                  </div>
                </div>
              </div>

              {/* Logout */}
              <div className="border-t border-[var(--medos-gray-100)] py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--medos-error)] hover:bg-[var(--medos-error-light)] transition-default"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
