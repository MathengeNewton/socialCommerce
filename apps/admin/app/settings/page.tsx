'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Client = { id: string; name: string };

type Integration = {
  id: string;
  clientId: string;
  provider: string;
  metadata?: { name?: string; email?: string };
  destinations?: Array<{ id: string; name: string; type: string }>;
};

const PROVIDERS: { id: string; name: string; icon: string; color: string }[] = [
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'from-blue-500 to-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'from-pink-500 to-purple-600' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'from-gray-800 to-gray-900' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', color: 'from-red-500 to-red-600' },
];

export default function SettingsPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
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

  const fetchIntegrations = async (clientId: string | null) => {
    if (!clientId) {
      setIntegrations([]);
      return;
    }
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${apiUrl}/integrations?clientId=${encodeURIComponent(clientId)}`, { headers });
    if (res.ok) {
      const data = await res.json();
      setIntegrations(Array.isArray(data) ? data : []);
    } else {
      setIntegrations([]);
    }
  };

  useEffect(() => {
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    (async () => {
      try {
        await fetchClients();
      } catch (e) {
        setError('Failed to load clients');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (clients.length && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    if (selectedClientId) {
      setError('');
      fetchIntegrations(selectedClientId);
    } else {
      setIntegrations([]);
    }
  }, [selectedClientId]);

  const connectProvider = async (provider: string) => {
    setError('');
    if (!selectedClientId) {
      setError('Select a client first');
      return;
    }

    // Facebook: redirect to OAuth
    if (provider === 'facebook') {
      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      if (!appId) {
        setError('Facebook App ID not configured (NEXT_PUBLIC_FACEBOOK_APP_ID).');
        return;
      }
      const redirectUri =
        typeof window !== 'undefined'
          ? `${window.location.origin}/settings/oauth/facebook`
          : '';
      const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts';
      const state = selectedClientId;
      const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
      window.location.href = url;
      return;
    }

    const headers = authHeaders();
    if (!headers) return;
    setConnecting(provider);
    try {
      const redirectUri =
        typeof window !== 'undefined'
          ? `${window.location.origin}/settings` 
          : 'http://localhost:3000/settings';
      const res = await fetch(`${apiUrl}/integrations/${provider}/connect`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          code: `demo_code_${Date.now()}`,
          redirectUri,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to connect');
      }
      await fetchIntegrations(selectedClientId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setConnecting(null);
    }
  };

  const disconnectIntegration = async (id: string) => {
    if (!confirm('Disconnect this integration?')) return;
    setError('');
    const headers = authHeaders();
    if (!headers) return;
    setDisconnecting(id);
    try {
      const res = await fetch(`${apiUrl}/integrations/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to disconnect');
      }
      if (selectedClientId) await fetchIntegrations(selectedClientId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect');
    } finally {
      setDisconnecting(null);
    }
  };

  const isConnected = (provider: string) =>
    integrations.some((i) => i.provider.toLowerCase() === provider.toLowerCase());

  const getIntegrationForProvider = (provider: string) =>
    integrations.find((i) => i.provider.toLowerCase() === provider.toLowerCase());

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600 font-medium">Loading settings...</p>
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
                hhourssop · Settings
              </h1>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Workspace / Client */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Workspace</h2>
            </div>
            <div>
              <label htmlFor="client" className="block text-sm font-semibold text-gray-700 mb-2">
                Current workspace (client)
              </label>
              <select
                id="client"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              >
                {clients.length === 0 ? (
                  <option value="">No clients</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Integrations below are for this client. Onboard clients from the Clients page.
              </p>
            </div>
          </div>

          {/* Social integrations */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Social media integrations</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Connect social accounts for the selected client to publish posts and link products.
            </p>
            {!selectedClientId ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
                Select a client above to manage integrations.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PROVIDERS.map((provider) => {
                  const connected = isConnected(provider.id);
                  const integration = getIntegrationForProvider(provider.id);
                  const busy = connecting === provider.id || (integration && disconnecting === integration.id);
                  return (
                    <div
                      key={provider.id}
                      className="p-5 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 bg-gradient-to-br ${provider.color} rounded-xl flex items-center justify-center text-2xl shadow-lg`}
                          >
                            {provider.icon}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{provider.name}</h3>
                            <p className="text-xs text-gray-500">
                              {connected
                                ? integration?.metadata && typeof integration.metadata === 'object' && 'name' in integration.metadata
                                  ? String((integration.metadata as { name?: string }).name || 'Connected')
                                  : 'Connected'
                                : 'Not connected'}
                            </p>
                          </div>
                        </div>
                        {connected ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                            Inactive
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          connected && integration
                            ? disconnectIntegration(integration.id)
                            : connectProvider(provider.id)
                        }
                        className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 ${
                          connected
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : `bg-gradient-to-r ${provider.color} text-white hover:shadow-lg transform hover:-translate-y-0.5`
                        }`}
                      >
                        {busy
                          ? '…'
                          : connected
                            ? 'Disconnect'
                            : 'Connect'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Account (unchanged) */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Account</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value="admin@demo.com"
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <button
                  type="button"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-gray-300 transition-colors text-left"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
