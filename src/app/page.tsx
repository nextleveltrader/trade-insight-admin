export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
      <p className="text-slate-400 mb-8">Welcome back! Here is what&apos;s happening with your AI automation today.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-slate-400 font-medium">Pending Drafts</h3>
          <p className="text-3xl font-bold mt-2">12</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-slate-400 font-medium">Active AI Prompts</h3>
          <p className="text-3xl font-bold mt-2 text-blue-500">45</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-slate-400 font-medium">Total Users</h3>
          <p className="text-3xl font-bold mt-2 text-emerald-500">1,204</p>
        </div>
      </div>
    </div>
  );
}