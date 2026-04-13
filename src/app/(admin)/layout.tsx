// src/app/(admin)/layout.tsx  (or wherever your admin shell lives)
import { logout } from '@/actions/auth.actions';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header>
        {/* your nav... */}
        <form action={logout}>
          <button type="submit">Log out</button>
        </form>
      </header>
      {children}
    </>
  );
}