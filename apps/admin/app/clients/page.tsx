'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import DataTable, { DataTableColumn } from '../components/DataTable';

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
      <AdminNav title="hhourssop · Clients" backHref="/dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-1">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Create client</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add a client (brand). Then connect their social accounts in <Link href="/integrations" className="text-blue-600 hover:underline">Integrations</Link>.
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
            ) : (
              <DataTable
                columns={[
                  { key: 'name', label: 'Name', sortable: true, exportValue: (r) => r.name, render: (r) => <span className="font-semibold">{r.name}</span> },
                  { key: 'id', label: 'ID', sortable: true, exportValue: (r) => r.id, render: (r) => <span className="text-xs font-mono text-gray-500">{r.id}</span> },
                  { key: 'actions', label: 'Actions', sortable: false, render: (r) => <Link className="text-blue-600 hover:underline text-sm font-medium" href={`/settings?clientId=${encodeURIComponent(r.id)}`}>Connect accounts</Link> },
                ]}
                data={clients}
                getRowId={(r) => r.id}
                emptyMessage="No clients yet. Create one to start onboarding accounts."
                title="Clients"
                actions={
                  <button onClick={async () => { setLoading(true); try { await fetchClients(); } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setLoading(false); } }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                    Refresh
                  </button>
                }
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

