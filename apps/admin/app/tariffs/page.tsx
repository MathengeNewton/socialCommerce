'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Tariff = {
  id: string;
  name: string;
  currency: string;
  minPostsPerWeek?: number;
  rulesJson?: Record<string, unknown>;
  createdAt?: string;
};

type Client = { id: string; name: string };

export default function TariffsPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignClientId, setAssignClientId] = useState('');
  const [assignTariffId, setAssignTariffId] = useState('');
  const [newName, setNewName] = useState('');
  const [newCurrency, setNewCurrency] = useState('USD');
  const [newMinPosts, setNewMinPosts] = useState(0);
  const [saving, setSaving] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchTariffs = async () => {
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${apiUrl}/tariffs`, { headers });
    if (res.ok) {
      const data = await res.json();
      setTariffs(Array.isArray(data) ? data : []);
    }
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
    const load = async () => {
      setError('');
      const headers = authHeaders();
      if (!headers) {
        router.push('/login');
        return;
      }
      try {
        await Promise.all([fetchTariffs(), fetchClients()]);
      } catch (e) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const createTariff = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const name = newName.trim();
    if (!name) {
      setError('Tariff name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/tariffs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          currency: newCurrency,
          minPostsPerWeek: newMinPosts,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create tariff');
      }
      setShowCreate(false);
      setNewName('');
      setNewCurrency('USD');
      setNewMinPosts(0);
      await fetchTariffs();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create tariff');
    } finally {
      setSaving(false);
    }
  };

  const assignTariff = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    if (!assignClientId || !assignTariffId) {
      setError('Select a client and a tariff');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/clients/${assignClientId}/tariff`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tariffId: assignTariffId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to assign tariff');
      }
      setShowAssign(false);
      setAssignClientId('');
      setAssignTariffId('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to assign tariff');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600 font-medium">Loading tariffs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                hhourssop · Tariffs
              </h1>
            </Link>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAssign(true);
                  setAssignClientId(clients[0]?.id ?? '');
                  setAssignTariffId(tariffs[0]?.id ?? '');
                }}
                className="bg-white border-2 border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold hover:border-gray-300 transition-colors flex items-center gap-2"
              >
                Assign to client
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create tariff</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {tariffs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl mb-6">
                <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No tariffs yet</h2>
              <p className="text-gray-600 mb-6">Create a tariff plan and assign it to clients for billing.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create tariff
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Currency</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Min posts/week</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tariffs.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-medium text-gray-900">{t.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{t.currency}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{t.minPostsPerWeek ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Assign tariffs to clients from the &quot;Assign to client&quot; button. Invoices are generated from the{' '}
          <Link href="/billing" className="text-blue-600 hover:underline">
            Billing
          </Link>{' '}
          page.
        </p>
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Create tariff</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Starter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <input
                  type="text"
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="USD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min posts per week</label>
                <input
                  type="number"
                  min={0}
                  value={newMinPosts}
                  onChange={(e) => setNewMinPosts(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createTariff}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Assign tariff to client</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select
                  value={assignClientId}
                  onChange={(e) => setAssignClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tariff</label>
                <select
                  value={assignTariffId}
                  onChange={(e) => setAssignTariffId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {tariffs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAssign(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={assignTariff}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
              >
                {saving ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
