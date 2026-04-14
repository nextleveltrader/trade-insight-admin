"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Activity, 
  Target, 
  Calendar, 
  Bookmark, 
  Settings,
  Crown
} from "lucide-react";

const NAV_LINKS = [
  { name: "Market Feed", href: "/dashboard", icon: Activity },
  { name: "ICT Setups", href: "/dashboard/ict", icon: Target },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Saved", href: "/dashboard/saved", icon: Bookmark },
];

export function UserSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-zinc-800/60 bg-zinc-950/50 backdrop-blur-xl h-screen sticky top-0">
      {/* Logo Section */}
      <div className="p-6 border-b border-zinc-800/60">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500">
            <Activity size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Trade<span className="text-sky-400">Insight</span>
          </span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Menu</p>
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" 
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <Icon size={16} className={isActive ? "text-sky-400" : "text-zinc-500"} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Settings & Trial Status (Bottom) */}
      <div className="p-4 border-t border-zinc-800/60 space-y-2">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 mb-2">
          <Crown size={16} className="text-amber-400" />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-amber-400">Pro Trial Active</span>
            <span className="text-[10px] text-zinc-500">14 days remaining</span>
          </div>
        </div>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-all"
        >
          <Settings size={16} className="text-zinc-500" />
          Settings
        </Link>
      </div>
    </aside>
  );
}