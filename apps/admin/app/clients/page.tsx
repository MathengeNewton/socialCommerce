'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Client = {
  id: string;
  name: string;
  createdAt?: string;
};

export default function ClientsPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string>('');

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchClients = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }

    const res = await fetch(`${apiUrl}/clients`, { headers });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to load clients');
    }
    const data = await res.json();
    setClients(data);
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchClients();
      } catch (e: any) {
        setError(e.message || 'Failed to load clients');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createClient = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const name = newName.trim();
    if (!name) {
      setError('Client name is required');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${apiUrl}/clients`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create client');
      }
      setNewName('');
      await fetchClients();
    } catch (e: any) {
      setError(e.message || 'Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  hhourssop · Clients
                </h1>
                <p className="text-xs text-gray-500">Onboard brands you post for</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link className="btn-secondary" href="/dashboard">
                Back
              </Link>
              <Link className="btn-primary" href="/settings">
                Integrations
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-1">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Create client</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add a client (brand). Then connect their social accounts in Settings.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            <label className="block text-sm font-semibold text-gray-700 mb-2">Client name</label>
            <input
              className="input-field mb-3"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Acme Real Estate"
            />
            <button className="btn-primary w-full" disabled={creating} onClick={createClient}>
              {creating ? 'Creating…' : 'Create client'}
            </button>
          </div>

          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Your clients</h2>
              <button
                className="btn-secondary"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await fetchClients();
                  } catch (e: any) {
                    setError(e.message || 'Failed to refresh');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 font-medium">Loading clients…</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-gray-600 font-medium">No clients yet.</p>
                <p className="text-gray-500 text-sm mt-1">Create one to start onboarding accounts.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{c.id}</div>
                    </div>
                    <Link className="btn-secondary" href={`/settings?clientId=${encodeURIComponent(c.id)}`}>
                      Connect accounts
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

