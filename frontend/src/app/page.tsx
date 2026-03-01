"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Shield,
  Brain,
  ClipboardList,
  Zap,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "10 AI Agents",
    description:
      "LangGraph agents with confidence scoring and bounded autonomy for clinical, billing, and operational workflows.",
  },
  {
    icon: ClipboardList,
    title: "X12 Revenue Pipeline",
    description:
      "837P/835 claims, Prior Authorization, Denial Management — automated end-to-end with AI agents.",
  },
  {
    icon: Shield,
    title: "HIPAA-Native Security",
    description:
      "Field-level encryption, tenant isolation, audit trails, break-the-glass access, SOC 2 compliance.",
  },
  {
    icon: Zap,
    title: "44 MCP Tools + A2A",
    description:
      "6 MCP servers, A2A protocol for agent-to-agent communication, FHIR R4 native data layer.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        router.push("/dashboard");
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[var(--medos-navy)] text-white">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[var(--medos-primary)] opacity-[0.06] translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[var(--medos-accent)] opacity-[0.05] -translate-x-1/4 translate-y-1/4" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full bg-[var(--medos-primary)] opacity-[0.03] -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary)] text-white font-bold text-lg">
              M
            </div>
            <span className="text-xl font-semibold tracking-tight">MedOS</span>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <div className="mb-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-[var(--medos-accent)] border border-white/10">
                AI-Native Healthcare OS
              </span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight mb-4">
              The operating system
              <br />
              for modern healthcare
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed mb-10">
              Unify clinical workflows, revenue cycle management, and patient engagement in one intelligent platform.
            </p>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-4 mb-10 text-sm">
              {["53 Routes", "44 MCP Tools", "10 AI Agents", "21 States"].map(
                (stat) => (
                  <span
                    key={stat}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-gray-300 text-xs font-medium border border-white/10"
                  >
                    {stat}
                  </span>
                )
              )}
            </div>

            {/* Features */}
            <div className="space-y-5">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex gap-4 items-start group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center transition-default group-hover:bg-[var(--medos-primary)]/20 group-hover:border-[var(--medos-primary)]/30">
                    <feature.icon className="w-5 h-5 text-[var(--medos-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-0.5">{feature.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bring Your Agent */}
            <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                Bring Your Agent
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                MedOS exposes 44 MCP tools and A2A endpoints. Connect your autonomous
                agent to clinical workflows, billing pipelines, and patient data.
              </p>
              <a
                href="/docs"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--medos-accent)] hover:text-white transition-colors"
              >
                Explore the docs
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-gray-600">
            HIPAA Compliant &middot; SOC 2 Type II &middot; HITRUST Certified
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[var(--medos-gray-50)]">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary)] text-white font-bold text-lg">
              M
            </div>
            <span className="text-xl font-semibold tracking-tight text-[var(--medos-navy)]">MedOS</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[var(--medos-navy)] mb-1">
              Welcome back
            </h2>
            <p className="text-sm text-[var(--medos-gray-500)] mb-8">
              Sign in to access your healthcare platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[var(--medos-error-light)] border border-red-200 text-sm text-[var(--medos-error)]">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4.25a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zM8 11a1 1 0 100 2 1 1 0 000-2z" />
                </svg>
                {error}
              </div>
            )}

            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="justin@medos.ai"
                autoComplete="email"
                disabled={isLoading}
                className="w-full h-11 px-3.5 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-900)] placeholder:text-[var(--medos-gray-400)] transition-default focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[var(--medos-gray-700)]"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs text-[var(--medos-primary)] hover:text-[var(--medos-primary-hover)] font-medium transition-default"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="w-full h-11 px-3.5 pr-10 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-900)] placeholder:text-[var(--medos-gray-400)] transition-default focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--medos-gray-400)] hover:text-[var(--medos-gray-600)] transition-default"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold transition-default hover:bg-[var(--medos-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-[var(--medos-gray-200)]">
            <p className="text-xs text-center text-[var(--medos-gray-400)]">
              Protected by enterprise-grade encryption.
              <br />
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>

          <div className="mt-4 text-center">
            <a
              href="/docs"
              className="text-xs text-[var(--medos-primary)] hover:text-[var(--medos-primary-hover)] font-medium transition-colors"
            >
              Are you an agent? Read the docs &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
