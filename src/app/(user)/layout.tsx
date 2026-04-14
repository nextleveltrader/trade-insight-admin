import { UserSidebar } from "@/components/user/UserSidebar";
import { MobileNav } from "@/components/user/MobileNav";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-white selection:bg-sky-500/30 selection:text-sky-200">
      {/* Desktop Sidebar */}
      <UserSidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {/* We add pb-20 on mobile so content doesn't hide behind the bottom nav */}
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}