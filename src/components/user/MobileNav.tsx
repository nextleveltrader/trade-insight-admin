"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Target, Calendar, Bookmark, Settings } from "lucide-react";

const MOBILE_LINKS = [
  { name: "Feed", href: "/dashboard", icon: Activity },
  { name: "ICT", href: "/dashboard/ict", icon: Target },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Saved", href: "/dashboard/saved", icon: Bookmark },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/60 pb-safe">
      <div className="flex items-center justify-around px-2 py-3">
        {MOBILE_LINKS.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                isActive ? "text-sky-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? "bg-sky-500/10" : ""}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-medium ${isActive ? "text-sky-400" : "text-zinc-500"}`}>
                {link.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}