'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import DataTable, { DataTableColumn } from '../components/DataTable';
import { useToast } from '../components/ToastContext';
import { useConfirm } from '../components/ConfirmContext';

type ServicePackage = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  priceLabel: string;
  cadence?: string | null;
  features: string[];
  ctaLabel: string;
  isActive: boolean;
  displayOrder: number;
};

type StorefrontSettings = {
  heroImageMediaId: string | null;
  heroImage: { id: string; url: string } | null;
};

const defaultForm = {
  name: '',
  slug: '',
  shortDescription: '',
  priceLabel: '',
  cadence: '',
  featuresText: '',
  ctaLabel: 'Book consultation',
  isActive: true,
  displayOrder: 0,
};

export default function PackagesPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [settings, setSettings] = useState<StorefrontSettings>({
    heroImageMediaId: null,
    heroImage: null,
  });

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchPackages = async () => {
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }

    const res = await fetch(`${apiUrl}/service-packages`, { headers });
    if (res.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to load packages');
    }
    const data = await res.json();
    setPackages(Array.isArray(data) ? data : []);
  };

  const fetchSettings = async () => {
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }

    const res = await fetch(`${apiUrl}/storefront-settings`, { headers });
    if (res.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to load storefront settings');
    }
    const data = await res.json();
    setSettings({
      heroImageMediaId: data?.heroImageMediaId ?? null,
      heroImage: data?.heroImage ?? null,
    });
  };

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([fetchPackages(), fetchSettings()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveSettings = async (payload: { heroImageMediaId: string | null }) => {
    const headers = authHeaders();
    if (!headers) return;

    setSettingsSaving(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/storefront-settings`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update storefront settings');
      setSettings({
        heroImageMediaId: data?.heroImageMediaId ?? null,
        heroImage: data?.heroImage ?? null,
      });
      toast('Hero image updated', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update storefront settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleHeroImageUpload = async (file: File) => {
    const headers = authHeaders();
    if (!headers || !file) return;

    setImageUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch(`${apiUrl}/media/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(uploadData.message || 'Hero image upload failed');

      await saveSettings({ heroImageMediaId: uploadData.mediaId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hero image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const removeHeroImage = async () => {
    await saveSettings({ heroImageMediaId: null });
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const openEdit = (pkg: ServicePackage) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      slug: pkg.slug,
      shortDescription: pkg.shortDescription,
      priceLabel: pkg.priceLabel,
      cadence: pkg.cadence ?? '',
      featuresText: pkg.features.join('\n'),
      ctaLabel: pkg.ctaLabel,
      isActive: pkg.isActive,
      displayOrder: pkg.displayOrder,
    });
    setShowForm(true);
  };

  const savePackage = async () => {
    const headers = authHeaders();
    if (!headers) return;

    const features = form.featuresText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!form.name.trim() || !form.shortDescription.trim() || !form.priceLabel.trim() || features.length === 0) {
      setError('Name, description, price label, and at least one feature are required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        shortDescription: form.shortDescription.trim(),
        priceLabel: form.priceLabel.trim(),
        cadence: form.cadence.trim() || undefined,
        features,
        ctaLabel: form.ctaLabel.trim() || undefined,
        isActive: form.isActive,
        displayOrder: form.displayOrder,
      };

      const res = await fetch(`${apiUrl}/service-packages${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to save package');

      await fetchPackages();
      setShowForm(false);
      toast(editingId ? 'Package updated' : 'Package created', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const deletePackage = async (pkg: ServicePackage) => {
    const ok = await confirm({
      title: 'Delete package',
      message: `Delete "${pkg.name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    const headers = authHeaders();
    if (!headers) return;

    try {
      const res = await fetch(`${apiUrl}/service-packages/${pkg.id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete package');
      await fetchPackages();
      toast('Package deleted', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete package');
    }
  };

  const columns: DataTableColumn<ServicePackage>[] = [
    {
      key: 'name',
      label: 'Package',
      render: (row) => (
        <>
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-500">{row.slug}</div>
        </>
      ),
      exportValue: (row) => row.name,
    },
    {
      key: 'priceLabel',
      label: 'Price',
      render: (row) => (
        <>
          <div className="font-medium text-gray-900">{row.priceLabel}</div>
          <div className="text-xs text-gray-500">{row.cadence || 'No cadence note'}</div>
        </>
      ),
      exportValue: (row) => row.priceLabel,
    },
    {
      key: 'displayOrder',
      label: 'Order',
      exportValue: (row) => String(row.displayOrder),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${row.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {row.isActive ? 'Active' : 'Hidden'}
        </span>
      ),
      exportValue: (row) => (row.isActive ? 'Active' : 'Hidden'),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <span className="flex gap-2">
          <button onClick={() => openEdit(row)} className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
          <button onClick={() => deletePackage(row)} className="text-red-600 hover:underline text-sm font-medium">Delete</button>
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <AdminNav title="hhourssop · Packages" backHref="/dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Hero visual
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">
                    Homepage hero image
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Upload the photo shown in the storefront hero section. This lets you replace the hero
                    visual without editing code.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    id="hero-image-upload"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void handleHeroImageUpload(file);
                    }}
                  />
                  <label
                    htmlFor="hero-image-upload"
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 ${
                      imageUploading || settingsSaving ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    {imageUploading ? 'Uploading…' : settings.heroImage ? 'Replace image' : 'Upload image'}
                  </label>
                  {settings.heroImage && (
                    <button
                      type="button"
                      onClick={() => void removeHeroImage()}
                      disabled={settingsSaving}
                      className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {settingsSaving ? 'Saving…' : 'Remove image'}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6">
                {settings.heroImage?.url ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img
                      src={settings.heroImage.url}
                      alt="Homepage hero preview"
                      className="h-[280px] w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                    No hero image uploaded yet.
                  </div>
                )}
              </div>
            </section>

            <DataTable
              title="Service packages"
              columns={columns}
              data={packages}
              getRowId={(row) => row.id}
              emptyMessage="No packages yet. Add a package to power the homepage rate card."
              actions={
                <button
                  onClick={openAdd}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Package
                </button>
              }
            />
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 p-6">
              <h2 className="text-xl font-bold">{editingId ? 'Edit package' : 'Add package'}</h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                  <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Slug</label>
                  <input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="optional-custom-slug" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Price label</label>
                  <input value={form.priceLabel} onChange={(e) => setForm((prev) => ({ ...prev, priceLabel: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="From KES 25,000" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cadence / note</label>
                  <input value={form.cadence} onChange={(e) => setForm((prev) => ({ ...prev, cadence: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="per month" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Short description</label>
                <textarea value={form.shortDescription} onChange={(e) => setForm((prev) => ({ ...prev, shortDescription: e.target.value }))} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Features</label>
                <p className="mb-2 text-xs text-gray-500">One feature per line.</p>
                <textarea value={form.featuresText} onChange={(e) => setForm((prev) => ({ ...prev, featuresText: e.target.value }))} rows={6} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder={'Content calendar\nMonthly reporting\nCommunity management'} />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">CTA label</label>
                  <input value={form.ctaLabel} onChange={(e) => setForm((prev) => ({ ...prev, ctaLabel: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Display order</label>
                  <input type="number" min="0" value={form.displayOrder} onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: parseInt(e.target.value, 10) || 0 }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    Active on storefront
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 p-6">
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={savePackage} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
