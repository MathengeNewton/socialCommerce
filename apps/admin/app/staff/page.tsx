'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import DataTable, { DataTableColumn } from '../components/DataTable';
import { useConfirm } from '../components/ConfirmContext';

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  memberships?: Array<{ clientId: string; client: { name: string }; role: string }>;
};

export default function StaffPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string>('');
  const [profile, setProfile] = useState<{ role: string } | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState<'admin' | 'staff'>('staff');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'staff'>('staff');
  const [editPassword, setEditPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const { confirm } = useConfirm();

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchUsers = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }

    const res = await fetch(`${apiUrl}/users`, { headers });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
        return;
      }
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to load staff');
    }
    const data = await res.json();
    setUsers(data);
  };

  const fetchProfile = async () => {
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${apiUrl}/auth/me`, { headers });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      if (data.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchProfile();
        await fetchUsers();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load staff');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createUser = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const email = createEmail.trim();
    const password = createPassword;
    const name = createName.trim();
    if (!email || !password || !name) {
      setError('Email, password, and name are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${apiUrl}/users`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role: createRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create user');
      }
      setCreateEmail('');
      setCreatePassword('');
      setCreateName('');
      setCreateRole('staff');
      setShowCreate(false);
      await fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const updateUser = async (id: string) => {
    setError('');
    const headers = authHeaders();
    if (!headers) return;

    const payload: { name?: string; role?: string; password?: string } = {
      name: editName.trim(),
      role: editRole,
    };
    if (editPassword) payload.password = editPassword;

    setUpdating(true);
    try {
      const res = await fetch(`${apiUrl}/users/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update user');
      }
      setEditingId(null);
      setEditPassword('');
      await fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const deleteUser = async (id: string, email: string) => {
    const ok = await confirm({
      message: `Remove user ${email}? This cannot be undone.`,
      title: 'Remove user',
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;
    setError('');
    const headers = authHeaders();
    if (!headers) return;

    try {
      const res = await fetch(`${apiUrl}/users/${id}`, { method: 'DELETE', headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to remove user');
      }
      await fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove user');
    }
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setEditName(u.name);
    setEditRole(u.role as 'admin' | 'staff');
    setEditPassword('');
  };

  const userRows = useMemo(
    () => users.map((u) => ({ ...u, _createdAt: new Date(u.createdAt).toLocaleDateString() })),
    [users]
  );

  if (profile && profile.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <AdminNav title="hhourssop · Staff" backHref="/dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Staff</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {showCreate && (
          <div className="card mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create user</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  className="input-field w-full"
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                <input
                  className="input-field w-full"
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  className="input-field w-full"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <select
                  className="input-field w-full"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as 'admin' | 'staff')}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-primary" disabled={creating} onClick={createUser}>
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button className="btn-secondary" onClick={() => setShowCreate(false)} disabled={creating}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={[
            { key: 'name', label: 'Name', sortable: true, exportValue: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'email', label: 'Email', sortable: true, exportValue: (r) => r.email, render: (r) => r.email },
            { key: 'role', label: 'Role', sortable: true, exportValue: (r) => r.role, render: (r) => <span className="capitalize">{r.role}</span> },
            { key: '_createdAt', label: 'Created', sortable: true, exportValue: (r) => (r as User & { _createdAt: string })._createdAt, render: (r) => (r as User & { _createdAt: string })._createdAt },
            { key: 'actions', label: 'Actions', sortable: false, render: (r) => (
              <span className="flex gap-2">
                <button onClick={() => startEdit(r)} className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
                <button onClick={() => deleteUser(r.id, r.email)} className="text-red-600 hover:underline text-sm font-medium">Remove</button>
              </span>
            ) },
          ]}
          data={userRows}
          getRowId={(r) => r.id}
          emptyMessage="No users yet. Add a user to get started."
          title="Staff"
          actions={<button onClick={() => { setShowCreate(true); setError(''); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Add user</button>}
        />

        {editingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Edit user</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={editRole} onChange={(e) => setEditRole(e.target.value as 'admin' | 'staff')}>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New password (optional)</label>
                  <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Leave blank to keep" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50" disabled={updating} onClick={() => editingId && updateUser(editingId)}>{updating ? 'Saving…' : 'Save'}</button>
                <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50" onClick={() => setEditingId(null)} disabled={updating}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
