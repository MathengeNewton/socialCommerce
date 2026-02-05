'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import AdminNav from '../../components/AdminNav';

type Post = {
  id: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  client: { id: string; name: string };
  captions: Array<{ platform: string; caption: string; hashtags?: string | null; includeLink: boolean }>;
  media: Array<{ media: { id: string; url: string; mimeType: string }; order: number }>;
  products: Array<{ product: { title: string; slug: string }; isPrimary: boolean }>;
  destinations: Array<{
    status: string;
    externalPostId: string | null;
    postUrl: string | null;
    publishedAt: string | null;
    error: string | null;
    destination: {
      id: string;
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
  twitter_account: 'X (Twitter)',
};

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [republishing, setRepublishing] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    if (!id) return;
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    fetch(`${apiUrl}/posts/${id}`, { headers })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            router.push('/login');
            return;
          }
          throw new Error('Post not found');
        }
        return res.json();
      })
      .then(setPost)
      .catch(() => setError('Failed to load post'))
      .finally(() => setLoading(false));
  }, [id, apiUrl, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
        <AdminNav title="hhourssop · Post" backHref="/posts" />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">Loading post…</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
        <AdminNav title="hhourssop · Post" backHref="/posts" />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <p className="text-red-600 text-sm">{error || 'Post not found'}</p>
            <Link href="/posts" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
              ← Back to posts
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const handleRepublish = async () => {
    const headers = authHeaders();
    if (!headers) return;
    setRepublishing(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/posts/${id}/publish`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Republish failed');
      }
      const updated = await res.json();
      setPost(updated);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Republish failed');
    } finally {
      setRepublishing(false);
    }
  };

  const statusConfig = {
    published: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: '✓' },
    failed: { bg: 'bg-red-100', text: 'text-red-800', icon: '!' },
    scheduled: { bg: 'bg-amber-100', text: 'text-amber-800', icon: '⏱' },
    publishing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '↻' },
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', icon: '○' },
  };
  const statusStyle = statusConfig[post.status as keyof typeof statusConfig] ?? statusConfig.draft;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
      <AdminNav title="hhourssop · Post" backHref="/posts" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-medium" aria-label="Dismiss">
              ✕
            </button>
          </div>
        )}

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Post details</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
                <Link href={`/clients/${post.client?.id}`} className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
                  {post.client?.name}
                </Link>
                <span>{new Date(post.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                <span className="text-xs">{statusStyle.icon}</span>
                {post.status}
              </span>
              {(post.status === 'failed' || (post.status === 'publishing' && post.destinations?.some((d) => d.status === 'failed'))) && (
                <button
                  type="button"
                  onClick={handleRepublish}
                  disabled={republishing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {republishing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Republishing…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Republish
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Media + Captions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-blue-500" />
                  Media
                </h2>
              </div>
              <div className="p-5">
                {post.media.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm rounded-xl bg-slate-50/50">
                    No media attached
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {post.media
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map(({ media }) =>
                        media.mimeType.startsWith('video/') ? (
                          <div key={media.id} className="rounded-xl overflow-hidden bg-slate-900 ring-1 ring-slate-200/60">
                            <video
                              src={media.url}
                              className="w-full aspect-video object-contain"
                              muted
                              playsInline
                              controls
                            />
                          </div>
                        ) : (
                          <a
                            key={media.id}
                            href={media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl overflow-hidden ring-1 ring-slate-200/60 hover:ring-blue-300 transition-all hover:shadow-md"
                          >
                            <img
                              src={media.url}
                              alt=""
                              className="w-full h-48 object-cover"
                            />
                          </a>
                        ),
                      )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Destinations - each with caption, hashtags, link */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-emerald-500" />
                  Destinations
                </h2>
                <p className="text-xs text-slate-500 mt-1">Caption, hashtags, and link for each platform</p>
              </div>
              <div className="p-5 space-y-4">
                {post.destinations.map((d) => {
                  const typeToPlatform: Record<string, string> = {
                    facebook_page: 'facebook',
                    instagram_business: 'instagram',
                    tiktok_account: 'tiktok',
                    twitter_account: 'twitter',
                  };
                  const platform = typeToPlatform[d.destination.type] || d.destination.type;
                  const caption = post.captions.find((c) => c.platform === platform);
                  return (
                    <div
                      key={d.destination.id}
                      className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {PLATFORM_LABELS[d.destination.type] || d.destination.type} · {d.destination.name}
                          </h3>
                          <span
                            className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-md ${
                              d.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                        {d.postUrl && (
                          <a
                            href={d.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View post
                          </a>
                        )}
                      </div>
                      {caption && (
                        <>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-2">
                            {caption.caption || '—'}
                          </p>
                          {caption.hashtags?.trim() && (
                            <p className="text-xs text-slate-600 mb-2">
                              <span className="font-medium text-slate-500">Hashtags:</span> {caption.hashtags}
                            </p>
                          )}
                          {caption.includeLink && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              Product link included
                            </span>
                          )}
                        </>
                      )}
                      {d.error && (
                        <p className="mt-2 text-xs text-red-600">{d.error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {post.products.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-violet-500" />
                    Products
                  </h2>
                </div>
                <ul className="p-4 space-y-2">
                  {post.products.map(({ product, isPrimary }) => (
                    <li key={product.slug} className="flex items-center gap-2 text-sm text-slate-700 py-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      {product.title}
                      {isPrimary && (
                        <span className="text-xs text-blue-600 font-medium">primary</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
