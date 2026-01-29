'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Supplier = { id: string; name: string; email?: string | null; phone?: string | null };
type Client = { id: string; name: string };
type Product = {
  id: string;
  clientId: string;
  supplierId: string;
  title: string;
  description: string;
  price: unknown;
  listPrice?: unknown;
  minSellPrice?: unknown;
  supplyPrice?: unknown;
  currency: string;
  slug: string;
  status: string;
  priceDisclaimer?: string | null;
  supplier?: Supplier;
  client?: Client;
};

const defaultProduct = {
  title: '',
  description: '',
  supplierId: '',
  clientId: '',
  currency: 'USD',
  slug: '',
  status: 'draft' as const,
  supplyPrice: 0,
  minSellPrice: 0,
  listPrice: 0,
  priceDisclaimer: '',
};

export default function ProductsPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filterClientId, setFilterClientId] = useState<string>('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultProduct);
  const [saving, setSaving] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const num = (v: unknown): number =>
    typeof v === 'number' ? v : typeof v === 'object' && v != null && 'toString' in v ? Number((v as { toString(): string }).toString()) : Number(v);

  const fetchClients = async () => {
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${apiUrl}/clients`, { headers });
    if (res.ok) setClients(await res.json());
  };

  const fetchSuppliers = async () => {
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${apiUrl}/suppliers`, { headers });
    if (res.ok) setSuppliers(await res.json());
  };

  const fetchProducts = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const url = filterClientId
      ? `${apiUrl}/products?clientId=${encodeURIComponent(filterClientId)}`
      : `${apiUrl}/products`;
    const res = await fetch(url, { headers });
    if (res.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Failed to load products');
      return;
    }
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([fetchClients(), fetchSuppliers()]);
        await fetchProducts();
      } catch (e) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, [filterClientId]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...defaultProduct,
      clientId: filterClientId || (clients[0]?.id ?? ''),
      supplierId: suppliers[0]?.id ?? '',
    });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description,
      supplierId: p.supplierId,
      clientId: p.clientId,
      currency: p.currency,
      slug: p.slug,
      status: p.status,
      supplyPrice: num(p.supplyPrice ?? p.price),
      minSellPrice: num(p.minSellPrice ?? p.price),
      listPrice: num(p.listPrice ?? p.price),
      priceDisclaimer: p.priceDisclaimer ?? '',
    });
    setShowForm(true);
  };

  const saveProduct = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const slugRaw = form.slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const slugFallback = form.title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const slug = slugRaw || slugFallback || 'product';
    const payload = {
      clientId: form.clientId,
      supplierId: form.supplierId,
      title: form.title.trim(),
      description: form.description.trim(),
      currency: form.currency,
      slug,
      status: form.status,
      supplyPrice: Number(form.supplyPrice),
      minSellPrice: Number(form.minSellPrice),
      listPrice: Number(form.listPrice),
      price: Number(form.listPrice),
      priceDisclaimer: form.priceDisclaimer?.trim() || undefined,
    };
    if (!payload.title || !payload.supplierId || !payload.clientId) {
      setError('Title, client, and supplier are required');
      return;
    }
    if (payload.listPrice < payload.minSellPrice) {
      setError('List price must be >= min sell price');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`${apiUrl}/products/${editingId}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to update product');
        }
      } else {
        const res = await fetch(`${apiUrl}/products`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to create product');
        }
      }
      setShowForm(false);
      await fetchProducts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    const headers = authHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${apiUrl}/products/${id}`, { method: 'DELETE', headers });
      if (res.ok) await fetchProducts();
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
          <p className="text-gray-600 font-medium">Loading products...</p>
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
                hhourssop · Products
              </h1>
            </Link>
            <button
              onClick={openAdd}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Product</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            Client
            <select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {products.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl mb-6">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No products yet</h2>
              <p className="text-gray-600 mb-6">Add a product to get started</p>
              <button
                onClick={openAdd}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add product
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Product</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Client</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Supplier</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Price</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{p.title}</div>
                        <div className="text-xs text-gray-500">{p.slug}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {(p as Product & { client?: Client }).client?.name ?? clients.find((c) => c.id === p.clientId)?.name ?? p.clientId}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{p.supplier?.name ?? p.supplierId}</td>
                      <td className="py-3 px-4 text-sm">
                        {p.currency} {num(p.listPrice ?? p.price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            p.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-blue-600 hover:underline text-sm font-medium mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="text-red-600 hover:underline text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit product' : 'Add product'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  disabled={!!editingId}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={form.supplierId}
                  onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Product name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="my-product"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supply price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.supplyPrice}
                    onChange={(e) => setForm((f) => ({ ...f, supplyPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min sell price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.minSellPrice}
                    onChange={(e) => setForm((f) => ({ ...f, minSellPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">List price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.listPrice}
                    onChange={(e) => setForm((f) => ({ ...f, listPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'draft' | 'published' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
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
                onClick={saveProduct}
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
