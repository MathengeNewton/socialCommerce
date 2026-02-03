'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';

type Profile = {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: string;
  memberships: Array< { clientId: string; clientName: string; role: string } >;
};

export default function SettingsPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchProfile = async () => {
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${apiUrl}/auth/me`, { headers });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setName(data.name || '');
    } else {
      if (res.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
        return;
      }
      setError('Failed to load profile');
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
        await fetchProfile();
      } catch (e) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleSaveName = async () => {
    const headers = authHeaders();
    if (!headers) return;
    setError('');
    setSavingName(true);
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update name');
      }
      const data = await res.json();
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim() || !newPassword.trim()) {
      setPasswordError('Current and new password are required');
      return;
    }
    const headers = authHeaders();
    if (!headers) return;
    setPasswordError('');
    setSavingPassword(true);
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to change password');
      }
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordForm(false);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600 font-medium">Loading account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <AdminNav title="hhourssop · Account" backHref="/dashboard" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Account details</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={profile?.email ?? ''}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingName ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                <p className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 capitalize">
                  {profile?.role === 'admin' ? 'Admin' : 'Staff'}
                </p>
              </div>
              {profile?.memberships && profile.memberships.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Client access</label>
                  <ul className="space-y-2">
                    {profile.memberships.map((m) => (
                      <li
                        key={m.clientId}
                        className="flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                      >
                        <span className="font-medium text-gray-900">{m.clientName}</span>
                        <span className="text-sm text-gray-600 capitalize">{m.role}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                {!showPasswordForm ? (
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(true)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-gray-300 transition-colors text-left"
                  >
                    Change password
                  </button>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    {passwordError && (
                      <p className="text-sm text-red-600">{passwordError}</p>
                    )}
                    <input
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingPassword ? 'Updating…' : 'Update password'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setPasswordError('');
                        }}
                        className="px-4 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
