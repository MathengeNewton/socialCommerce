'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import DataTable, { DataTableColumn } from '../components/DataTable';
import { useConfirm } from '../components/ConfirmContext';

type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt?: string;
};

const defaultForm = { name: '', phone: '', email: '', address: '' };

export default function SuppliersPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const { confirm } = useConfirm();

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchSuppliers = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const res = await fetch(`${apiUrl}/suppliers`, { headers });
    if (res.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Failed to load suppliers');
      return;
    }
    const data = await res.json();
    setSuppliers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchSuppliers();
      } catch (e) {
        setError('Failed to load suppliers');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      phone: s.phone ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
    });
    setShowForm(true);
  };

  const saveSupplier = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const name = form.name.trim();
    if (!name) {
      setError('Name is required');
      return;
    }
    const body = {
      name,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
    };
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`${apiUrl}/suppliers/${editingId}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to update supplier');
        }
      } else {
        const res = await fetch(`${apiUrl}/suppliers`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to create supplier');
        }
      }
      setShowForm(false);
      await fetchSuppliers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async (id: string) => {
    const ok = await confirm({
      message: 'Delete this supplier? Products linked to them may be affected.',
      title: 'Delete supplier',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    const headers = authHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${apiUrl}/suppliers/${id}`, { method: 'DELETE', headers });
      if (res.ok) await fetchSuppliers();
      else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to delete');
      }
    } catch {
      setError('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600 font-medium">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <AdminNav title="hhourssop · Suppliers" backHref="/dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end mb-4">
          <button
            onClick={openAdd}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Supplier</span>
          </button>
        </div>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <DataTable
          columns={[
            { key: 'name', label: 'Name', sortable: true, exportValue: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'email', label: 'Email', sortable: true, exportValue: (r) => r.email ?? '', render: (r) => r.email ?? '—' },
            { key: 'phone', label: 'Phone', sortable: true, exportValue: (r) => r.phone ?? '', render: (r) => r.phone ?? '—' },
            { key: 'address', label: 'Address', sortable: true, exportValue: (r) => r.address ?? '', render: (r) => <span className="max-w-xs truncate block">{r.address ?? '—'}</span> },
            { key: 'actions', label: 'Actions', sortable: false, render: (r) => (
              <span className="flex gap-2">
                <button onClick={() => openEdit(r)} className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
                <button onClick={() => deleteSupplier(r.id)} className="text-red-600 hover:underline text-sm font-medium">Delete</button>
              </span>
            ) },
          ]}
          data={suppliers}
          getRowId={(r) => r.id}
          emptyMessage="No suppliers yet. Add a supplier to link products to."
          title="Suppliers"
          actions={
            <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Supplier
            </button>
          }
        />
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit supplier' : 'Add supplier'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Full address"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSupplier}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
