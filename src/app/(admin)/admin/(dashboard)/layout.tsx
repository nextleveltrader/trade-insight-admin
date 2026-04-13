// src/app/(admin)/admin/(dashboard)/layout.tsx
//
// Sidebar-enabled layout for all dashboard routes:
//   /admin          → overview
//   /admin/posts    → blog posts
//   /admin/assets   → assets & prompts
//
// The (dashboard) route group is invisible in the URL — it is purely
// a filesystem grouping so this layout does not affect any slug.

import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      {/* ml-64 offsets the fixed-width sidebar defined in Sidebar.tsx */}
      <main className="flex-1 ml-64 p-8 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
}