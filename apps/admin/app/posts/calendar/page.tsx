'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminNav from '../../components/AdminNav';

type Post = {
  id: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  client: { id: string; name: string };
  destinations: Array<{
    destination: { type: string };
  }>;
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-amber-100 text-amber-800',
  publishing: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const PLATFORM_FILTER_OPTIONS = [
  { value: 'facebook_page', label: 'Facebook' },
  { value: 'instagram_business', label: 'Instagram' },
  { value: 'tiktok_account', label: 'TikTok' },
  { value: 'twitter_account', label: 'X (Twitter)' },
];

function getPostDate(post: Post): Date {
  const d = post.scheduledAt || post.createdAt;
  return new Date(d);
}

function CalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [filterClientId, setFilterClientId] = useState<string>('');
  const [filterPlatforms, setFilterPlatforms] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
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
  }, [filterClientId]);

  const filteredPosts = useMemo(() => {
    if (filterPlatforms.length === 0) return posts;
    return posts.filter((p) =>
      p.destinations.some((d) => filterPlatforms.includes(d.destination.type))
    );
  }, [posts, filterPlatforms]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of filteredPosts) {
      const d = getPostDate(post);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    }
    return map;
  }, [filteredPosts]);

  const { daysInMonth, startPad, endPad } = useMemo(() => {
    const y = currentMonth.year;
    const m = currentMonth.month;
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const firstDay = first.getDay();
    const days = last.getDate();
    const total = firstDay + days;
    const endPad = total % 7 === 0 ? 0 : 7 - (total % 7);
    return { daysInMonth: days, startPad: firstDay, endPad };
  }, [currentMonth]);

  const prevMonth = () => {
    setCurrentMonth((prev) =>
      prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }
    );
  };

  const nextMonth = () => {
    setCurrentMonth((prev) =>
      prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }
    );
  };

  const monthLabel = `${new Date(currentMonth.year, currentMonth.month).toLocaleString('default', { month: 'long' })} ${currentMonth.year}`;

  const togglePlatform = (platform: string) => {
    setFilterPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
        <AdminNav title="hhourssop · Calendar" backHref="/dashboard" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">Loading calendar…</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
      <AdminNav title="hhourssop · Calendar" backHref="/dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Post Calendar</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/posts"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-md hover:bg-slate-100"
            >
              List view
            </Link>
            <Link
              href="/compose"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create post
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Client</label>
            <select
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[160px]"
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
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => togglePlatform(opt.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterPlatforms.includes(opt.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-lg font-semibold text-slate-900">{monthLabel}</h3>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-semibold text-slate-500 bg-slate-50"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: startPad }, (_, i) => (
              <div key={`pad-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50" />
            ))}
            {Array.from({ length: daysInMonth + endPad }, (_, i) => {
              const day = i + 1;
              if (day > daysInMonth) {
                return <div key={`end-pad-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50" />;
              }
              const key = `${currentMonth.year}-${currentMonth.month}-${day}`;
              const dayPosts = postsByDate.get(key) || [];
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === currentMonth.month &&
                new Date().getFullYear() === currentMonth.year;
              return (
                <div
                  key={day}
                  className={`min-h-[100px] border-b border-r border-slate-100 p-1.5 ${
                    isToday ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <span
                    className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-medium ${
                      isToday ? 'bg-blue-600 text-white' : 'text-slate-700'
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px]">
                    {dayPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/posts/${post.id}`}
                        className="block truncate text-xs px-1.5 py-0.5 rounded border-l-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/80 transition-colors"
                        title={`${post.client?.name || 'Unknown'} · ${post.status}`}
                      >
                        <span className={`inline-block px-1 py-0.5 rounded text-[10px] font-medium mr-1 ${STATUS_COLORS[post.status] || 'bg-gray-100'}`}>
                          {post.status}
                        </span>
                        {post.client?.name || 'Post'}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400" /> Published
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-400" /> Draft
          </span>
        </div>
      </main>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
