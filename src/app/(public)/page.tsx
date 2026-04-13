import Link from 'next/link';
import { getPublishedPosts } from '@/actions/blog.actions';

export default async function HomePage() {
  // ডাটাবেস থেকে শুধু পাবলিশড পোস্টগুলো নিয়ে আসছি
  const allPosts = await getPublishedPosts();
  const recentPosts = allPosts.slice(0, 3); // হোমপেজে শুধু লেটেস্ট ৩টি পোস্ট দেখাব

  return (
    <div>
      {/* ── Hero Section ── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-zinc-950 to-zinc-950" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            Master the Markets with <span className="text-emerald-500">Insight</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Get real-time trading analysis, forex strategies, and crypto market updates from professional traders.
          </p>
          <Link 
            href="/blog" 
            className="inline-flex items-center gap-2 bg-emerald-500 text-zinc-950 font-semibold px-8 py-4 rounded-full hover:bg-emerald-400 transition-all hover:scale-105"
          >
            Read the Blog
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Recent Posts Section ── */}
      <section className="max-w-6xl mx-auto px-4 py-20 border-t border-zinc-900">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold text-white">Latest Analysis</h2>
          <Link href="/blog" className="text-emerald-500 hover:text-emerald-400 font-medium">
            View all posts →
          </Link>
        </div>

        {recentPosts.length === 0 ? (
          <div className="text-center py-20 border border-zinc-800 border-dashed rounded-2xl bg-zinc-900/50">
            <p className="text-zinc-400">No published posts yet. Go to admin panel to write one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug || post.id}`} className="group flex flex-col h-full bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden hover:bg-zinc-800/80 hover:border-zinc-700 transition-all">
                <div className="p-6 flex flex-col flex-1">
                  {post.category && (
                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3 block">
                      {post.category}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-zinc-100 mb-3 group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-zinc-400 text-sm mb-6 line-clamp-3 flex-1">
                    {post.metaDescription || "Click to read the full market analysis and insights."}
                  </p>
                  <div className="text-xs text-zinc-500 flex items-center gap-2 mt-auto">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}