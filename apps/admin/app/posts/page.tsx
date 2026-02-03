'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import DataTable, { DataTableColumn } from '../components/DataTable';

type Post = {
  id: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  client: { id: string; name: string };
  captions: Array<{ platform: string; caption: string }>;
  media: Array<{ media: { url: string; mimeType: string } }>;
  destinations: Array<{
    status: string;
    publishedAt: string | null;
    destination: {
      name: string;
      type: string;
      integration?: { provider: string };
    };
  }>;
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook_page: 'Facebook',
  instagram_business: 'Instagram',
  tiktok_account: 'TikTok',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-amber-100 text-amber-800',
  publishing: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

function PostsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [filterClientId, setFilterClientId] = useState<string>('');
  const [error, setError] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchPosts = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const url = filterClientId
      ? `${apiUrl}/posts?clientId=${encodeURIComponent(filterClientId)}`
      : `${apiUrl}/posts`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
        return;
      }
      setError('Failed to load posts');
      return;
    }
    const data = await res.json();
    setPosts(Array.isArray(data) ? data : []);
  };

  const fetchClients = async () => {
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${apiUrl}/clients`, { headers });
    if (res.ok) {
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    }
  };

  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (clientId) setFilterClientId(clientId);
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      try {
        await fetchClients();
        await fetchPosts();
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterClientId]);

  const postRows = useMemo(
    () =>
      posts.map((p) => {
        const platforms = p.destinations.map((d) => PLATFORM_LABELS[d.destination.type] || d.destination.type);
        return {
          ...p,
          _clientName: p.client?.name ?? '',
          _caption: p.captions[0]?.caption ?? '',
          _platforms: platforms.join(', '),
          _createdAt: new Date(p.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
        };
      }),
    [posts]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
      <AdminNav title="hhourssop · Posts" backHref="/dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">All Posts</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">Loading posts…</p>
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'media', label: 'Media', sortable: false, render: (p) => {
                const thumb = (p as Post).media[0]?.media;
                return (
                  <Link href={`/posts/${(p as Post).id}`} className="block w-10 h-10 rounded-md overflow-hidden bg-slate-100 shrink-0 ring-1 ring-slate-200/60">
                    {thumb ? (thumb.mimeType.startsWith('video/') ? <video src={thumb.url} className="w-full h-full object-cover" muted playsInline /> : <img src={thumb.url} alt="" className="w-full h-full object-cover" />) : <div className="w-full h-full flex items-center justify-center text-base text-slate-300">📝</div>}
                  </Link>
                );
              }},
              { key: '_clientName', label: 'Client', sortable: true, exportValue: (p) => (p as Post & { _clientName: string })._clientName, render: (p) => <Link href={`/posts/${(p as Post).id}`} className="font-medium text-blue-600 hover:underline">{(p as Post & { _clientName: string })._clientName || 'Unknown'}</Link> },
              { key: 'status', label: 'Status', sortable: true, exportValue: (p) => (p as Post).status, render: (p) => <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[(p as Post).status] || 'bg-gray-100'}`}>{(p as Post).status}</span> },
              { key: '_caption', label: 'Caption', sortable: true, exportValue: (p) => (p as Post & { _caption: string })._caption, render: (p) => <span className="text-sm text-gray-600 line-clamp-2 max-w-[200px] block">{(p as Post & { _caption: string })._caption || '—'}</span> },
              { key: '_platforms', label: 'Platforms', sortable: true, exportValue: (p) => (p as Post & { _platforms: string })._platforms, render: (p) => <span className="text-xs">{(p as Post & { _platforms: string })._platforms}</span> },
              { key: '_createdAt', label: 'Created', sortable: true, exportValue: (p) => (p as Post & { _createdAt: string })._createdAt, render: (p) => (p as Post & { _createdAt: string })._createdAt },
              { key: 'actions', label: 'Actions', sortable: false, exportValue: () => 'View', render: (p) => (
                <Link href={`/posts/${(p as Post).id}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium" title="View">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  View
                </Link>
              ) },
            ]}
            data={postRows}
            getRowId={(p) => (p as Post).id}
            emptyMessage="No posts yet. Create your first post to get started."
            title="Posts"
            filters={
              <select
                className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[160px]"
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
              >
                <option value="">All clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            }
            pagination={{ pageSize: 10 }}
            actions={
              <div className="flex items-center gap-2">
                <Link href="/posts/calendar" className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-md hover:bg-slate-100">Calendar</Link>
                <Link href="/posts/analysis" className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-md hover:bg-slate-100">Analysis</Link>
                <Link href="/compose" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Create post
                </Link>
              </div>
            }
          />
        )}
      </main>
    </div>
  );
}

export default function PostsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" /></div>}>
      <PostsContent />
    </Suspense>
  );
}
