export const runtime = 'edge';

import Link from 'next/link';

export default function DashboardOverview() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-emerald-500">Dashboard Overview</h1>
            <p className="text-zinc-400">Welcome back! Here is what's happening with your Trade Insight CMS today.</p>
          </div>
          <Link 
            href="/posts" 
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Manage Posts
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <h3 className="text-zinc-400 font-medium">Pending Drafts</h3>
            <p className="text-3xl font-bold mt-2">--</p>
          </div>
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <h3 className="text-zinc-400 font-medium">Published Posts</h3>
            <p className="text-3xl font-bold mt-2 text-emerald-500">--</p>
          </div>
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <h3 className="text-zinc-400 font-medium">Total Views</h3>
            <p className="text-3xl font-bold mt-2 text-blue-500">--</p>
          </div>
        </div>
      </div>
    </div>
  );
}