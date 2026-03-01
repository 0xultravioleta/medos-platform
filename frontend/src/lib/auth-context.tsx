"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = "medos_auth_user";

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Mock auth provider for demo.
 * In production: Auth0 with SMART on FHIR, RS256 JWT validation.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Restore session on mount (survives full-page navigations)
  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
  }, []);

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    // Mock: any credentials work. In production, this calls Auth0.
    await new Promise((r) => setTimeout(r, 800)); // Simulate network delay

    const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const newUser: User = {
      id: "usr-demo-001",
      name: name || "Demo User",
      email,
      role: "physician",
      tenant: "Sunshine Medical Group",
      avatar: undefined,
    };

    setUser(newUser);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newUser));

    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
