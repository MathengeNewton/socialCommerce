'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import AdminNav from '../../components/AdminNav';
import { useToast } from '../../components/ToastContext';
import { useConfirm } from '../../components/ConfirmContext';

type Integration = {
  id: string;
  provider: string;
  metadata?: { name?: string; email?: string };
  destinations?: Array<{ id: string; name: string; type: string }>;
};

type ClientDetail = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  integrations: Integration[];
  postCountByStatus: Record<string, number>;
  totalPosts: number;
};

const PROVIDERS: { id: string; name: string; icon: string; color: string }[] = [
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'from-blue-500 to-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'from-pink-500 to-purple-600' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'from-gray-900 to-black' },
  { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', color: 'from-slate-800 to-slate-900' },
];

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchClient = async () => {
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${apiUrl}/clients/${id}/detail`, { headers });
    if (res.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to load client');
    }
    const data = await res.json();
    setClient(data);
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        await fetchClient();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load client');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleToggleActive = async () => {
    if (!client) return;
    const ok = await confirm({
      message: client.active
        ? 'Deactivate this client? They will no longer appear in active client lists.'
        : 'Activate this client?',
      title: client.active ? 'Deactivate client' : 'Activate client',
      confirmLabel: client.active ? 'Deactivate' : 'Activate',
      variant: client.active ? 'danger' : 'default',
    });
    if (!ok) return;
    setToggling(true);
    try {
      const headers = authHeaders();
      if (!headers) return;
      const res = await fetch(`${apiUrl}/clients/${id}/active`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !client.active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchClient();
      toast(client.active ? 'Client deactivated' : 'Client activated', 'success');
    } catch {
      toast('Failed to update client', 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      message: 'Delete this client? All posts, integrations, and related data will be removed. This cannot be undone.',
      title: 'Delete client',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const headers = authHeaders();
      if (!headers) return;
      const res = await fetch(`${apiUrl}/clients/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to delete');
      toast('Client deleted', 'success');
      router.push('/clients');
    } catch {
      toast('Failed to delete client', 'error');
    }
  };

  const connectProvider = async (provider: string) => {
    if (provider === 'facebook') {
      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      if (!appId) {
        toast('Facebook App ID not configured', 'error');
        return;
      }
      const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/settings/oauth/facebook` : '';
      const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts';
      window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(id)}`;
      return;
    }
    if (provider === 'instagram') {
      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      if (!appId) {
        toast('Instagram uses Facebook Login. Set NEXT_PUBLIC_FACEBOOK_APP_ID.', 'error');
        return;
      }
      const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/settings/oauth/facebook` : '';
      const scope = 'instagram_basic,instagram_content_publish,pages_show_list';
      window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(`instagram:${id}`)}`;
      return;
    }
    if (provider === 'tiktok') {
      const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
      if (!clientKey) {
        toast('TikTok not configured. Set NEXT_PUBLIC_TIKTOK_CLIENT_KEY.', 'error');
        return;
      }
      const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/settings/oauth/tiktok` : '';
      const scope = 'user.info.basic,video.publish,video.upload';
      window.location.href = `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(clientKey)}&scope=${encodeURIComponent(scope)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(id)}`;
      return;
    }
  };

  const disconnectIntegration = async (integrationId: string) => {
    const ok = await confirm({
      message: 'Disconnect this integration?',
      title: 'Disconnect',
      confirmLabel: 'Disconnect',
      variant: 'danger',
    });
    if (!ok) return;
    setDisconnecting(integrationId);
    try {
      const headers = authHeaders();
      if (!headers) return;
      const res = await fetch(`${apiUrl}/integrations/${integrationId}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to disconnect');
      await fetchClient();
      toast('Integration disconnected', 'success');
    } catch {
      toast('Failed to disconnect', 'error');
    } finally {
      setDisconnecting(null);
    }
  };

  const isConnected = (provider: string) =>
    client?.integrations?.some((i) => i.provider.toLowerCase() === provider.toLowerCase()) ?? false;

  const getIntegrationForProvider = (provider: string) =>
    client?.integrations?.find((i) => i.provider.toLowerCase() === provider.toLowerCase());

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-slate-600 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
        <AdminNav title="hhourssop · Client" backHref="/clients" />
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-slate-600 mb-4">{error || 'Client not found'}</p>
          <Link href="/clients" className="text-blue-600 hover:underline font-medium">
            Back to clients
          </Link>
        </main>
      </div>
    );
  }

  const postStatusLabels: Record<string, string> = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    published: 'Published',
    publishing: 'Publishing',
    failed: 'Failed',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
      <AdminNav title={`hhourssop · ${client.name}`} backHref="/clients" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                    client.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {client.active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-sm text-slate-500">
                  Created {new Date(client.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleToggleActive}
                disabled={toggling}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                  client.active
                    ? 'border border-amber-300 text-amber-700 hover:bg-amber-50'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {toggling ? '…' : client.active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-xl text-sm font-medium hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Posts by status */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Posts</h2>
          <div className="flex flex-wrap gap-3">
            <div className="px-4 py-2 bg-slate-100 rounded-xl">
              <span className="text-sm text-slate-600">Total</span>
              <span className="ml-2 font-bold text-slate-900">{client.totalPosts}</span>
            </div>
            {Object.entries(client.postCountByStatus || {}).map(([status, count]) => (
              <div
                key={status}
                className={`px-4 py-2 rounded-xl ${
                  status === 'published'
                    ? 'bg-emerald-100 text-emerald-800'
                    : status === 'draft'
                      ? 'bg-slate-100 text-slate-700'
                      : status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                }`}
              >
                <span className="text-sm">{postStatusLabels[status] || status}</span>
                <span className="ml-2 font-bold">{count}</span>
              </div>
            ))}
          </div>
          <Link
            href={`/posts?clientId=${id}`}
            className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:underline text-sm font-medium"
          >
            View all posts
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Integrations */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Integrations</h2>
          <p className="text-sm text-slate-600 mb-4">
            Connect social accounts to publish posts for this client.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PROVIDERS.map((provider) => {
              const connected = isConnected(provider.id);
              const integration = getIntegrationForProvider(provider.id);
              const busy =
                connecting === provider.id || (integration && disconnecting === integration.id);
              return (
                <div
                  key={provider.id}
                  className="p-4 border-2 border-slate-200 rounded-xl hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 bg-gradient-to-br ${provider.color} rounded-lg flex items-center justify-center text-xl`}
                      >
                        {provider.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                        <p className="text-xs text-slate-500">
                          {connected ? 'Connected' : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        connected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {connected ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      connected && integration
                        ? disconnectIntegration(integration.id)
                        : connectProvider(provider.id)
                    }
                    className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all disabled:opacity-50 ${
                      connected
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : `bg-gradient-to-r ${provider.color} text-white hover:shadow-lg`
                    }`}
                  >
                    {busy ? '…' : connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
