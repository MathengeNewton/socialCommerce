'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

export default function PostsPage() {
  const router = useRouter();
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <AdminNav title="hhourssop · Posts" backHref="/dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">All Posts</h2>
          <div className="flex items-center gap-3">
            <Link href="/posts/analysis" className="btn-secondary">
              Analysis
            </Link>
            <select
              className="input-field max-w-[200px]"
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Link href="/compose" className="btn-primary">
              Create post
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Loading posts…</p>
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'media', label: 'Media', sortable: false, render: (p) => {
                const thumb = (p as Post).media[0]?.media;
                return (
                  <Link href={`/posts/${(p as Post).id}`} className="block w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {thumb ? (thumb.mimeType.startsWith('video/') ? <video src={thumb.url} className="w-full h-full object-cover" muted playsInline /> : <img src={thumb.url} alt="" className="w-full h-full object-cover" />) : <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">📝</div>}
                  </Link>
                );
              }},
              { key: '_clientName', label: 'Client', sortable: true, exportValue: (p) => (p as Post & { _clientName: string })._clientName, render: (p) => <Link href={`/posts/${(p as Post).id}`} className="font-medium text-blue-600 hover:underline">{(p as Post & { _clientName: string })._clientName || 'Unknown'}</Link> },
              { key: 'status', label: 'Status', sortable: true, exportValue: (p) => (p as Post).status, render: (p) => <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[(p as Post).status] || 'bg-gray-100'}`}>{(p as Post).status}</span> },
              { key: '_caption', label: 'Caption', sortable: true, exportValue: (p) => (p as Post & { _caption: string })._caption, render: (p) => <span className="text-sm text-gray-600 line-clamp-2 max-w-[200px] block">{(p as Post & { _caption: string })._caption || '—'}</span> },
              { key: '_platforms', label: 'Platforms', sortable: true, exportValue: (p) => (p as Post & { _platforms: string })._platforms, render: (p) => <span className="text-xs">{(p as Post & { _platforms: string })._platforms}</span> },
              { key: '_createdAt', label: 'Created', sortable: true, exportValue: (p) => (p as Post & { _createdAt: string })._createdAt, render: (p) => (p as Post & { _createdAt: string })._createdAt },
              { key: 'actions', label: 'Actions', sortable: false, render: (p) => <Link href={`/posts/${(p as Post).id}`} className="text-blue-600 hover:underline text-sm font-medium">View</Link> },
            ]}
            data={postRows}
            getRowId={(p) => (p as Post).id}
            emptyMessage="No posts yet. Create your first post to get started."
            title="Posts"
            filters={
              <select className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm" value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)}>
                <option value="">All clients</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            }
            actions={
              <div className="flex gap-2">
                <Link href="/posts/analysis" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Analysis</Link>
                <Link href="/compose" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create post</Link>
              </div>
            }
          />
        )}
      </main>
    </div>
  );
}
