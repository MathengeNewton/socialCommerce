'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import DataTable, { DataTableColumn } from '../components/DataTable';
import { useToast } from '../components/ToastContext';

type Client = {
  id: string;
  name: string;
  active?: boolean;
  createdAt?: string;
};

const PAGE_SIZE = 15;

export default function ClientsPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

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
    const res = await fetch(`${apiUrl}/clients?includeInactive=${showInactive}`, { headers });
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
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load clients');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const createClient = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const name = newName.trim();
    if (!name) {
      toast('Client name is required', 'error');
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
      setShowCreate(false);
      await fetchClients();
      toast('Client created', 'success');
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed to create client', 'error');
    } finally {
      setCreating(false);
    }
  };

  const rowsWithMeta = useMemo(
    () =>
      clients.map((c) => ({
        ...c,
        _createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—',
        _status: c.active !== false ? 'Active' : 'Inactive',
      })),
    [clients]
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rowsWithMeta.slice(start, start + PAGE_SIZE);
  }, [rowsWithMeta, page]);

  const totalPages = Math.ceil(rowsWithMeta.length / PAGE_SIZE) || 1;

  const columns: DataTableColumn<Client & { _createdAt: string; _status: string }>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      exportValue: (r) => r.name,
      render: (r) => (
        <Link
          href={`/clients/${r.id}`}
          className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          {r.name}
        </Link>
      ),
    },
    {
      key: '_status',
      label: 'Status',
      sortable: true,
      exportValue: (r) => (r.active !== false ? 'Active' : 'Inactive'),
      render: (r) => (
        <span
          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
            r.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {r.active !== false ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: '_createdAt',
      label: 'Created',
      sortable: true,
      exportValue: (r) => r._createdAt,
      render: (r) => r._createdAt,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (r) => (
        <div className="flex gap-2">
          <Link
            href={`/clients/${r.id}`}
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            View
          </Link>
          <Link
            href={`/integrations?clientId=${encodeURIComponent(r.id)}`}
            className="text-slate-600 hover:underline text-sm font-medium"
          >
            Integrations
          </Link>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-slate-600 font-medium">Loading clients…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
      <AdminNav title="hhourssop · Clients" backHref="/dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">Clients</h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Show inactive
                </label>
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add client
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <DataTable
              columns={columns}
              data={paginatedRows}
              getRowId={(r) => r.id}
              emptyMessage="No clients yet. Add a client to get started."
              title="Clients"
              pagination={{
                page,
                totalPages,
                total: rowsWithMeta.length,
                pageSize: PAGE_SIZE,
                onPageChange: setPage,
              }}
              filters={
                <span className="text-sm text-slate-500">
                  {rowsWithMeta.length} client{rowsWithMeta.length !== 1 ? 's' : ''}
                </span>
              }
            />
          </div>
        </div>
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Add client</h2>
            <p className="text-sm text-slate-600 mb-4">
              Add a client (brand). Then connect their social accounts from the client detail page.
            </p>
            <input
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Acme Brand"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewName('');
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={createClient}
                disabled={creating || !newName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
