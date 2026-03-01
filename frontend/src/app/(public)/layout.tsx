import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--medos-gray-50)]">
      <header className="h-14 border-b border-[var(--medos-gray-200)] bg-white flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--medos-primary)] text-white font-bold text-xs">
            M
          </div>
          <span className="font-semibold text-[var(--medos-navy)]">MedOS</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-[var(--medos-gray-600)] hover:text-[var(--medos-gray-900)] transition-colors"
        >
          Sign in
        </Link>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      <footer className="text-center py-6 text-xs text-[var(--medos-gray-400)] border-t border-[var(--medos-gray-100)]">
        HIPAA Compliant &middot; SOC 2 &middot; FHIR R4 &middot; Built for Healthcare
      </footer>
    </div>
  );
}
