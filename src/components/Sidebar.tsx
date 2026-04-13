// src/components/Sidebar.tsx
import Link from 'next/link';
import { LayoutDashboard, Database, FileText, Languages, Users } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 h-screen border-r border-slate-800 p-4 fixed left-0 top-0">
      <div className="text-2xl font-bold text-white mb-8 pl-2 mt-4">
        Trade <span className="text-blue-500">Insight</span>
      </div>
      <nav className="flex flex-col gap-2">
        <Link href="/admin" className="flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-800 p-3 rounded-lg transition-colors">
          <LayoutDashboard size={20} /> Dashboard
        </Link>
        <Link href="/admin/assets" className="flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-800 p-3 rounded-lg transition-colors">
          <Database size={20} /> Assets &amp; Prompts
        </Link>
        <Link href="/admin/posts" className="flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-800 p-3 rounded-lg transition-colors">
          <FileText size={20} /> Blog Posts
        </Link>
        <Link href="/admin/translate" className="flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-800 p-3 rounded-lg transition-colors">
          <Languages size={20} /> Translations
        </Link>
        <Link href="/admin/users" className="flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-800 p-3 rounded-lg transition-colors">
          <Users size={20} /> User Panel
        </Link>
      </nav>
    </aside>
  );
}