// src/app/(admin)/admin/layout.tsx
//
// Clean shell for the entire /admin/* subtree.
// The Login page lives here and deliberately has NO sidebar.
// The (dashboard) route group nested below adds its own sidebar layout.

export default function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}