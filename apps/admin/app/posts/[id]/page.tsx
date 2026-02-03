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
  captions: Array<{ platform: string; caption: string; includeLink: boolean }>;
  media: Array<{ media: { id: string; url: string; mimeType: string }; order: number }>;
  products: Array<{ product: { title: string; slug: string }; isPrimary: boolean }>;
  destinations: Array<{
    status: string;
    externalPostId: string | null;
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
};

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <AdminNav title="hhourssop · Post" backHref="/posts" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading…</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <AdminNav title="hhourssop · Post" backHref="/posts" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <p className="text-red-600">{error || 'Post not found'}</p>
            <Link href="/posts" className="btn-secondary mt-4 inline-block">
              Back to posts
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <AdminNav title="hhourssop · Post" backHref="/posts" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Post details</h2>
            <p className="text-sm text-gray-500 mt-1">
              Client: <span className="font-medium text-gray-700">{post.client?.name}</span> ·{' '}
              {new Date(post.createdAt).toLocaleString()}
            </p>
          </div>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full capitalize ${
              post.status === 'published'
                ? 'bg-green-100 text-green-800'
                : post.status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : post.status === 'scheduled'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-700'
            }`}
          >
            {post.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-4">Media</h3>
              {post.media.length === 0 ? (
                <p className="text-gray-500 text-sm">No media attached</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {post.media
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map(({ media }) =>
                      media.mimeType.startsWith('video/') ? (
                        <div key={media.id} className="rounded-xl overflow-hidden bg-black">
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
                          className="block rounded-xl overflow-hidden border border-gray-200 hover:border-blue-300 transition-colors"
                        >
                          <img
                            src={media.url}
                            alt=""
                            className="w-full h-auto object-cover max-h-80"
                          />
                        </a>
                      ),
                    )}
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3">Captions by platform</h3>
              <div className="space-y-3">
                {post.captions.map((c) => (
                  <div key={c.platform} className="border-b border-gray-100 pb-3 last:border-0">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {c.platform}
                    </span>
                    <p className="text-gray-700 mt-1 whitespace-pre-wrap">{c.caption}</p>
                    {c.includeLink && (
                      <span className="text-xs text-blue-600">Link included</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3">Destinations</h3>
              <ul className="space-y-2">
                {post.destinations.map((d) => (
                  <li
                    key={d.destination.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {PLATFORM_LABELS[d.destination.type] || d.destination.type} –{' '}
                      {d.destination.name}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        d.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : d.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {d.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {post.products.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-gray-900 mb-3">Products</h3>
                <ul className="space-y-1">
                  {post.products.map(({ product, isPrimary }) => (
                    <li key={product.slug} className="text-sm">
                      {product.title}
                      {isPrimary && (
                        <span className="ml-2 text-xs text-blue-600">(primary)</span>
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
