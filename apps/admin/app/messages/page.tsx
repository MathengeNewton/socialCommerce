'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';

type MessageRow = {
  id: string;
  name: string;
  phone: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export default function MessagesPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ items: MessageRow[]; total: number }>({ items: [], total: 0 });
  const [error, setError] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchMessages = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const res = await fetch(`${apiUrl}/messages?limit=100`, { headers });
    if (res.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
      return;
    }
    if (!res.ok) {
      setError('Failed to load messages');
      return;
    }
    const json = await res.json();
    setData({ items: json.items ?? [], total: json.total ?? 0 });
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchMessages();
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiUrl]);

  const markAsRead = async (id: string) => {
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${apiUrl}/messages/${id}/read`, {
      method: 'PATCH',
      headers,
    });
    if (res.ok) await fetchMessages();
  };

  const unreadCount = data.items.filter((m) => !m.readAt).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav title="hhourssop · Messages" backHref="/dashboard" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Contact messages</h1>
          {unreadCount > 0 && (
            <span className="text-sm text-slate-500">
              {unreadCount} unread
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : data.items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs mt-1 text-slate-400">Messages from the shop contact form will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Phone</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Message</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((m) => (
                    <tr
                      key={m.id}
                      className={`border-b border-slate-100 last:border-0 ${!m.readAt ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="py-3 px-4">
                        {m.readAt ? (
                          <span className="text-slate-400 text-xs">Read</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                            New
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{m.name}</td>
                      <td className="py-3 px-4 text-slate-700">{m.phone}</td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={m.message}>
                        {m.message.length > 80 ? `${m.message.slice(0, 80)}…` : m.message}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {!m.readAt && (
                          <button
                            type="button"
                            onClick={() => markAsRead(m.id)}
                            className="text-blue-600 hover:underline text-xs font-medium"
                          >
                            Mark as read
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
