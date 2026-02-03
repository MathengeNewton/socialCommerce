'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminNav from '../../components/AdminNav';

type Post = {
  id: string;
  status: string;
  createdAt: string;
  scheduledAt: string | null;
  client: { id: string; name: string };
  destinations: Array<{
    status: string;
    publishedAt: string | null;
    destination: { type: string; name: string };
  }>;
};

type ClientStats = {
  clientId: string;
  clientName: string;
  total: number;
  published: number;
  draft: number;
  scheduled: number;
  failed: number;
  byPlatform: Record<string, number>;
};

export default function PostsAnalysisPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    fetch(`${apiUrl}/posts`, { headers })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            router.push('/login');
            return;
          }
          throw new Error('Failed to load');
        }
        return res.json();
      })
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load posts'))
      .finally(() => setLoading(false));
  }, [apiUrl, router]);

  const platformLabel = (type: string) => {
    const m: Record<string, string> = {
      facebook_page: 'Facebook',
      instagram_business: 'Instagram',
      tiktok_account: 'TikTok',
    };
    return m[type] || type;
  };

  const stats = useMemo(() => {
    const byClient = new Map<string, ClientStats>();

    for (const post of posts) {
      const clientId = post.client?.id || 'unknown';
      const clientName = post.client?.name || 'Unknown';

      if (!byClient.has(clientId)) {
        byClient.set(clientId, {
          clientId,
          clientName,
          total: 0,
          published: 0,
          draft: 0,
          scheduled: 0,
          failed: 0,
          byPlatform: {},
        });
      }
      const s = byClient.get(clientId)!;
      s.total += 1;

      if (post.status === 'published') s.published += 1;
      else if (post.status === 'draft') s.draft += 1;
      else if (post.status === 'scheduled') s.scheduled += 1;
      else if (post.status === 'failed') s.failed += 1;

      for (const d of post.destinations) {
        const platform = platformLabel(d.destination.type);
        s.byPlatform[platform] = (s.byPlatform[platform] || 0) + 1;
      }
    }

    return Array.from(byClient.values()).sort((a, b) => b.total - a.total);
  }, [posts]);

  const totals = useMemo(() => {
    let total = 0;
    let published = 0;
    const byPlatform: Record<string, number> = {};
    for (const post of posts) {
      total += 1;
      if (post.status === 'published') published += 1;
      for (const d of post.destinations) {
        const p = platformLabel(d.destination.type);
        byPlatform[p] = (byPlatform[p] || 0) + 1;
      }
    }
    return { total, published, byPlatform };
  }, [posts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <AdminNav title="hhourssop · Posts Analysis" backHref="/posts" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading analysis…</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <AdminNav title="hhourssop · Posts Analysis" backHref="/posts" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Posts analysis</h2>
          <Link href="/posts" className="btn-secondary">
            View all posts
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <p className="text-sm font-medium text-gray-500">Total posts</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totals.total}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-500">Published</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{totals.published}</p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-500">By platform</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(totals.byPlatform).map(([platform, count]) => (
                <span
                  key={platform}
                  className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded"
                >
                  {platform}: {count}
                </span>
              ))}
              {Object.keys(totals.byPlatform).length === 0 && (
                <span className="text-sm text-gray-400">No data</span>
              )}
            </div>
          </div>
        </div>

        {/* By client */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">By client</h3>
          {stats.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No posts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Client</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Total</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Published</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Draft</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Scheduled</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Failed</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.clientId} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-medium text-gray-900">{s.clientName}</td>
                      <td className="py-3 px-4">{s.total}</td>
                      <td className="py-3 px-4 text-green-600">{s.published}</td>
                      <td className="py-3 px-4">{s.draft}</td>
                      <td className="py-3 px-4 text-amber-600">{s.scheduled}</td>
                      <td className="py-3 px-4 text-red-600">{s.failed}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(s.byPlatform).map(([p, c]) => (
                            <span
                              key={p}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                            >
                              {p}: {c}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
