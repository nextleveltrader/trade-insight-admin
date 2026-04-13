// src/app/(public)/layout.tsx
import Link from 'next/link';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tighter flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-zinc-950">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
            </span>
            Trade<span className="text-emerald-500">Insight</span>
          </Link>
          <nav className="flex gap-6 text-sm font-medium text-zinc-400">
            <Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link>
            <Link href="/blog" className="hover:text-emerald-400 transition-colors">Blog</Link>
            <Link href="/admin/posts" className="hover:text-white transition-colors">Admin</Link>
          </nav>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8 text-center text-zinc-500 text-sm">
        <p>© {new Date().getFullYear()} Trade Insight. All rights reserved.</p>
      </footer>
    </div>
  );
}