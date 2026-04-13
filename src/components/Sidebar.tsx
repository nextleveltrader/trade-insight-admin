// src/components/Sidebar.tsx
import Link from 'next/link';
import { LayoutDashboard, Database, FileText, Languages, Users } from 'lucide-react';
import LogoutButton from './LogoutButton'; // আমরা যে নতুন বাটনটি বানিয়েছি সেটি ইম্পোর্ট করা হলো

export default function Sidebar() {
  return (
    // flex flex-col যুক্ত করা হয়েছে যাতে ভেতরের জিনিসগুলো উপর-নিচ সাজানো যায়
    <aside className="w-64 bg-slate-900 h-screen border-r border-slate-800 p-4 fixed left-0 top-0 flex flex-col">
      
      {/* লোগো সেকশন */}
      <div className="text-2xl font-bold text-white mb-8 pl-2 mt-4">
        Trade <span className="text-blue-500">Insight</span>
      </div>
      
      {/* নেভিগেশন লিংকগুলো (flex-1 দেওয়ার কারণে এটি মাঝখানের পুরো জায়গা নিয়ে নেবে) */}
      <nav className="flex flex-col gap-2 flex-1">
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

      {/* লগআউট বাটন সেকশন (একদম নিচে থাকবে) */}
      <div className="mt-auto pt-4 border-t border-slate-800">
        <LogoutButton />
      </div>

    </aside>
  );
}