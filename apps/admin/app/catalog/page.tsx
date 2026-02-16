'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import DataTable, { DataTableColumn } from '../components/DataTable';
import { BulkResultModal } from '../components/BulkResultModal';
import { useToast } from '../components/ToastContext';
import { useConfirm } from '../components/ConfirmContext';

type Supplier = { id: string; name: string; email?: string | null; phone?: string | null };
type Category = { id: string; name: string; slug: string; order: number };
type ProductImage = { id: string; mediaId: string; order: number; media?: { id: string; url: string } };
type ProductVariant = { id: string; name: string; sku: string; stock: number; price?: unknown; currency?: string | null };
type Product = {
  id: string;
  supplierId: string;
  categoryId?: string | null;
  title: string;
  description: string;
  price: unknown;
  listPrice?: unknown;
  supplyPrice?: unknown;
  minSellPrice?: unknown;
  currency: string;
  slug: string;
  status: string;
  supplier?: Supplier;
  category?: Category | null;
  images?: ProductImage[];
  variants?: ProductVariant[];
};

type VariantOption = { name: string; price: number | ''; currency: string; stock: number };
const defaultProduct = {
  title: '',
  description: '',
  supplierId: '',
  categoryId: '' as string | null,
  currency: 'KES',
  slug: '',
  status: 'draft' as 'draft' | 'published',
  supplyPrice: 0,
  minSellPrice: 0,
  listPrice: 0,
  priceDisclaimer: '',
  imageIds: [] as string[],
  variantName: '' as string,
  variantOptions: [] as VariantOption[],
};

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [activeTab, setActiveTab] = useState<'categories' | 'products'>(
    tabParam === 'products' ? 'products' : 'categories'
  );

  useEffect(() => {
    if (tabParam === 'products') setActiveTab('products');
    else if (tabParam === 'categories') setActiveTab('categories');
  }, [tabParam]);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [error, setError] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', order: 0 });
  const [productForm, setProductForm] = useState(defaultProduct);
  const [saving, setSaving] = useState(false);
  const [productImages, setProductImages] = useState<Array<{ id: string; url: string }>>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ summary: { total: number; succeeded: number; failed: number }; results: { rowIndex: number; success: boolean; id?: string; error?: string }[] } | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const num = (v: unknown): number =>
    typeof v === 'number' ? v : typeof v === 'object' && v != null && 'toString' in v ? Number((v as { toString(): string }).toString()) : Number(v);

  const fetchCategories = async () => {
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${apiUrl}/categories`, { headers });
    if (res.ok) setCategories(await res.json());
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
    const params = new URLSearchParams();
    if (filterCategoryId) params.set('categoryId', filterCategoryId);
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    const res = await fetch(`${apiUrl}/products?${params.toString()}`, { headers });
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
    const items = data.products ?? (Array.isArray(data) ? data : []);
    setProducts(items);
    setTotal(data.total ?? items.length);
    setTotalPages(data.totalPages ?? 1);
  };

  useEffect(() => {
    setPage(1);
  }, [filterCategoryId]);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([fetchSuppliers(), fetchCategories()]);
        if (activeTab === 'products') await fetchProducts();
      } catch (e) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeTab === 'products') fetchProducts();
  }, [activeTab, filterCategoryId, page]);

  const openAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({ name: '', slug: '', order: categories.length });
    setShowCategoryForm(true);
  };

  const openEditCategory = (c: Category) => {
    setEditingCategoryId(c.id);
    setCategoryForm({ name: c.name, slug: c.slug, order: c.order });
    setShowCategoryForm(true);
  };

  const saveCategory = async () => {
    const headers = authHeaders();
    if (!headers) return;
    if (!categoryForm.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingCategoryId) {
        const res = await fetch(`${apiUrl}/categories/${editingCategoryId}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryForm),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to update');
      } else {
        const res = await fetch(`${apiUrl}/categories`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryForm),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to create');
      }
      setShowCategoryForm(false);
      await fetchCategories();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    const ok = await confirm({
      message: 'Delete this category? Products will be unassigned.',
      title: 'Delete category',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    const headers = authHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${apiUrl}/categories/${id}`, { method: 'DELETE', headers });
      if (res.ok) await fetchCategories();
      else setError((await res.json().catch(() => ({}))).message || 'Failed to delete');
    } catch {
      setError('Failed to delete');
    }
  };

  const handleCategoriesBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || bulkUploading) return;
    const headers = authHeaders();
    if (!headers) return;
    setBulkUploading(true);
    toast('Uploading categories…', 'info');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${apiUrl}/categories/bulk/upload`, { method: 'POST', headers, body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setBulkResult(data);
      await fetchCategories();
      toast(`Categories import complete: ${data.summary?.succeeded ?? 0} succeeded, ${data.summary?.failed ?? 0} failed`, data.summary?.failed ? 'info' : 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setBulkUploading(false);
    }
  };

  const handleProductsBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || bulkUploading) return;
    const headers = authHeaders();
    if (!headers) return;
    setBulkUploading(true);
    toast('Uploading products…', 'info');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${apiUrl}/products/bulk/upload`, { method: 'POST', headers, body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setBulkResult(data);
      await fetchProducts();
      toast(`Products import complete: ${data.summary?.succeeded ?? 0} succeeded, ${data.summary?.failed ?? 0} failed`, data.summary?.failed ? 'info' : 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setBulkUploading(false);
    }
  };

  const openAddProduct = () => {
    setEditingProductId(null);
    setProductImages([]);
    setProductForm({
      ...defaultProduct,
      supplierId: suppliers[0]?.id ?? '',
      categoryId: categories[0]?.id ?? null,
    });
    setShowProductForm(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    const images = (p as Product & { images?: ProductImage[] }).images ?? [];
    const sorted = [...images].sort((a, b) => a.order - b.order);
    const variants = (p as Product & { variants?: ProductVariant[] }).variants ?? [];
    let variantName = '';
    const variantOptions: VariantOption[] = variants.map((v) => {
      const match = v.name.match(/^(.+):\s*(.+)$/);
      if (match) {
        if (!variantName) variantName = match[1].trim();
        return {
          name: match[2].trim(),
          price: v.price != null ? num(v.price) : '',
          currency: (v.currency ?? p.currency).slice(0, 3),
          stock: v.stock ?? 0,
        };
      }
      return {
        name: v.name,
        price: v.price != null ? num(v.price) : '',
        currency: (v.currency ?? p.currency).slice(0, 3),
        stock: v.stock ?? 0,
      };
    });
    setProductImages(
      sorted.map((img) => ({
        id: img.media?.id ?? img.mediaId,
        url: img.media?.url ?? '',
      }))
    );
    setProductForm({
      ...defaultProduct,
      title: p.title,
      description: p.description,
      supplierId: p.supplierId,
      categoryId: p.categoryId ?? null,
      currency: p.currency,
      slug: p.slug,
      status: p.status === 'published' ? 'published' : 'draft',
      supplyPrice: num(p.supplyPrice ?? p.price),
      minSellPrice: num(p.minSellPrice ?? p.price),
      listPrice: num(p.listPrice ?? p.price),
      priceDisclaimer: (p as Product & { priceDisclaimer?: string }).priceDisclaimer ?? '',
      imageIds: sorted.map((img) => img.mediaId),
      variantName,
      variantOptions,
    });
    setShowProductForm(true);
  };

  const saveProduct = async () => {
    const headers = authHeaders();
    if (!headers) return;
    const slug = productForm.slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ||
      productForm.title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'product';
    const variantOptionsPayload =
      productForm.variantName?.trim() && productForm.variantOptions?.length
        ? productForm.variantOptions
            .filter((o) => o.name.trim())
            .map((o) => ({
              name: o.name.trim(),
              price: o.price === '' ? undefined : Number(o.price),
              currency: o.currency || undefined,
              stock: Number(o.stock) || 0,
            }))
        : undefined;

    const payload = {
      supplierId: productForm.supplierId,
      categoryId: productForm.categoryId || undefined,
      title: productForm.title.trim(),
      description: productForm.description.trim(),
      currency: productForm.currency,
      slug,
      status: productForm.status,
      supplyPrice: Number(productForm.supplyPrice),
      minSellPrice: Number(productForm.minSellPrice),
      listPrice: Number(productForm.listPrice),
      price: Number(productForm.listPrice),
      priceDisclaimer: productForm.priceDisclaimer?.trim() || undefined,
      imageIds: productForm.imageIds?.length ? productForm.imageIds : undefined,
      variantName: productForm.variantName?.trim() || undefined,
      variantOptions: variantOptionsPayload,
    };
    if (!payload.title || !payload.supplierId) {
      setError('Title and supplier are required');
      return;
    }
    setSaving(true);
    try {
      if (editingProductId) {
        const res = await fetch(`${apiUrl}/products/${editingProductId}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to update');
      } else {
        const res = await fetch(`${apiUrl}/products`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to create');
      }
      setShowProductForm(false);
      await fetchProducts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    const ok = await confirm({
      message: 'Delete this product?',
      title: 'Delete product',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    const headers = authHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${apiUrl}/products/${id}`, { method: 'DELETE', headers });
      if (res.ok) await fetchProducts();
      else setError((await res.json().catch(() => ({}))).message || 'Failed to delete');
    } catch {
      setError('Failed to delete');
    }
  };

  const categoryColumns: DataTableColumn<Category>[] = [
    { key: 'name', label: 'Name', sortable: true, exportValue: (r) => r.name },
    { key: 'slug', label: 'Slug', sortable: true, exportValue: (r) => r.slug },
    { key: 'order', label: 'Order', sortable: true, exportValue: (r) => String(r.order) },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <span className="flex gap-2">
          <button onClick={() => openEditCategory(row)} className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
          <button onClick={() => deleteCategory(row.id)} className="text-red-600 hover:underline text-sm font-medium">Delete</button>
        </span>
      ),
    },
  ];

  const productRows = useMemo(() =>
    products.map((p) => {
      const variants = (p as Product & { variants?: ProductVariant[] }).variants ?? [];
      const listPriceStr = `${p.currency} ${num(p.listPrice ?? p.price).toFixed(2)}`;
      const variantPrices = variants.map((v) => (v.price != null ? num(v.price) : num(p.listPrice ?? p.price)));
      const priceStr =
        variants.length > 0
          ? variantPrices.length > 0
            ? `From ${p.currency} ${Math.min(...variantPrices).toFixed(2)} (${variants.length} variant${variants.length === 1 ? '' : 's'})`
            : `${listPriceStr} (${variants.length} variant${variants.length === 1 ? '' : 's'})`
          : listPriceStr;
      return {
        ...p,
        _categoryName: p.category?.name ?? '',
        _supplierName: p.supplier?.name ?? '',
        _priceStr: priceStr,
        _variantCount: variants.length,
      };
    }),
    [products]
  );

  const productColumns: DataTableColumn<Product & { _categoryName: string; _supplierName: string; _priceStr: string; _variantCount: number }>[] = [
    { key: 'title', label: 'Product', sortable: true, exportValue: (r) => r.title, render: (r) => <><div className="font-medium">{r.title}</div><div className="text-xs text-gray-500">{r.slug}</div></> },
    { key: '_categoryName', label: 'Category', sortable: true, exportValue: (r) => r._categoryName || '—', render: (r) => r._categoryName || '—' },
    { key: '_supplierName', label: 'Supplier', sortable: true, exportValue: (r) => r._supplierName, render: (r) => r._supplierName || '—' },
    { key: '_priceStr', label: 'Price', sortable: true, exportValue: (r) => r._priceStr, render: (r) => <span className="whitespace-nowrap">{r._priceStr}</span> },
    { key: 'status', label: 'Status', sortable: true, exportValue: (r) => r.status, render: (r) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{r.status}</span> },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <span className="flex gap-2">
          <button onClick={() => openEditProduct(row)} className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
          <button onClick={() => deleteProduct(row.id)} className="text-red-600 hover:underline text-sm font-medium">Delete</button>
        </span>
      ),
    },
  ];

  if (loading && activeTab === 'categories') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <AdminNav title="hhourssop · Catalog" backHref="/dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-6 py-3 font-semibold rounded-t-lg transition-colors ${
              activeTab === 'categories' ? 'bg-white border border-b-0 border-gray-200 text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-semibold rounded-t-lg transition-colors ${
              activeTab === 'products' ? 'bg-white border border-b-0 border-gray-200 text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Products
          </button>
        </div>

        {activeTab === 'categories' && (
          <>
            <>
              <input type="file" accept=".csv" className="hidden" id="categories-bulk-file" onChange={handleCategoriesBulkFile} disabled={bulkUploading} />
              <DataTable
                title="Categories"
                columns={categoryColumns}
                data={categories}
                getRowId={(r) => r.id}
                emptyMessage="No categories yet. Create one to organize your products."
                actions={
                  <span className="flex items-center gap-2">
                    <label htmlFor="categories-bulk-file" className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 cursor-pointer ${bulkUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {bulkUploading ? 'Uploading…' : 'Bulk upload (CSV)'}
                    </label>
                    <button onClick={openAddCategory} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Category
                    </button>
                  </span>
                }
              />
            </>
          </>
        )}

        {activeTab === 'products' && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : (
              <DataTable
                title="Products"
                columns={productColumns}
                data={productRows}
                getRowId={(r) => r.id}
                emptyMessage="No products yet. Add a product to get started."
                filters={
                  <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
                      <option value="">All categories</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                }
                actions={
                  <span className="flex items-center gap-2">
                    <input type="file" accept=".csv" className="hidden" id="products-bulk-file" onChange={handleProductsBulkFile} disabled={bulkUploading} />
                    <label htmlFor="products-bulk-file" className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 cursor-pointer ${bulkUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {bulkUploading ? 'Uploading…' : 'Bulk upload (CSV)'}
                    </label>
                    <button onClick={openAddProduct} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Product
                    </button>
                  </span>
                }
                pagination={totalPages > 1 ? { page, totalPages, total, pageSize, onPageChange: setPage } : undefined}
              />
            )}
          </>
        )}
      </main>

      {/* Category modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingCategoryId ? 'Edit category' : 'Add category'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value, slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. Vehicles" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input type="text" value={categoryForm.slug} onChange={(e) => setCategoryForm((f) => ({ ...f, slug: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="vehicles" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input type="number" min="0" value={categoryForm.order} onChange={(e) => setCategoryForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCategoryForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveCategory} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Product modal - reuse from products page */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">{editingProductId ? 'Edit product' : 'Add product'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier <span className="text-red-500">*</span></label>
                <select value={productForm.supplierId} onChange={(e) => setProductForm((f) => ({ ...f, supplierId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={productForm.categoryId ?? ''} onChange={(e) => setProductForm((f) => ({ ...f, categoryId: e.target.value || null }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product photos</label>
                <p className="text-xs text-gray-500 mb-2">Upload images (PNG, JPEG). First image is the main photo.</p>
                <input
                  type="file"
                  id="product-image-upload"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file || productImages.length >= 5) return;
                    setImageUploading(true);
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      // Media for shop products - tenant-level (no client)
                      const res = await fetch(`${apiUrl}/media/upload`, {
                        method: 'POST',
                        headers: authHeaders() ?? {},
                        body: formData,
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || 'Upload failed');
                      }
                      const data = await res.json();
                      setProductImages((prev) => [...prev, { id: data.mediaId, url: data.url }]);
                      setProductForm((f) => ({ ...f, imageIds: [...(f.imageIds ?? []), data.mediaId] }));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Upload failed');
                    } finally {
                      setImageUploading(false);
                    }
                  }}
                />
                <div className="flex flex-wrap gap-3">
                  {productImages.map((img, i) => (
                    <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setProductImages((prev) => prev.filter((_, idx) => idx !== i));
                          setProductForm((f) => ({
                            ...f,
                            imageIds: (f.imageIds ?? []).filter((_, idx) => idx !== i),
                          }));
                        }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {productImages.length < 5 && (
                    <label
                      htmlFor="product-image-upload"
                      className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors ${imageUploading ? 'pointer-events-none opacity-70' : ''}`}
                    >
                      {imageUploading ? (
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-xs text-gray-500">Add</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={productForm.title} onChange={(e) => setProductForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Product name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={productForm.description} onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input type="text" value={productForm.slug} onChange={(e) => setProductForm((f) => ({ ...f, slug: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="my-product" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supply price</label>
                  <input type="number" step="0.01" min="0" value={productForm.supplyPrice} onChange={(e) => setProductForm((f) => ({ ...f, supplyPrice: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min sell price</label>
                  <input type="number" step="0.01" min="0" value={productForm.minSellPrice} onChange={(e) => setProductForm((f) => ({ ...f, minSellPrice: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">List price (fallback)</label>
                  <input type="number" step="0.01" min="0" value={productForm.listPrice} onChange={(e) => setProductForm((f) => ({ ...f, listPrice: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variants (e.g. storage options)</label>
                <p className="text-xs text-gray-500 mb-2">Add options like 64GB, 128GB with price and stock per variant. Leave empty for no variants.</p>
                <div className="mb-2">
                  <input
                    type="text"
                    value={productForm.variantName}
                    onChange={(e) => setProductForm((f) => ({ ...f, variantName: e.target.value }))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Variant label (e.g. Storage)"
                  />
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Option (e.g. 64GB)</th>
                        <th className="text-left px-3 py-2 font-medium">Price</th>
                        <th className="text-left px-3 py-2 font-medium">Currency</th>
                        <th className="text-left px-3 py-2 font-medium">Stock</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {(productForm.variantOptions ?? []).map((opt, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={opt.name}
                              onChange={(e) =>
                                setProductForm((f) => ({
                                  ...f,
                                  variantOptions: (f.variantOptions ?? []).map((o, i) => (i === idx ? { ...o, name: e.target.value } : o)),
                                }))
                              }
                              className="w-full px-2 py-1.5 border border-gray-200 rounded"
                              placeholder="64GB"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={opt.price === '' ? '' : opt.price}
                              onChange={(e) =>
                                setProductForm((f) => ({
                                  ...f,
                                  variantOptions: (f.variantOptions ?? []).map((o, i) => (i === idx ? { ...o, price: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 } : o)),
                                }))
                              }
                              className="w-full px-2 py-1.5 border border-gray-200 rounded"
                              placeholder="—"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={opt.currency}
                              onChange={(e) =>
                                setProductForm((f) => ({
                                  ...f,
                                  variantOptions: (f.variantOptions ?? []).map((o, i) => (i === idx ? { ...o, currency: e.target.value } : o)),
                                }))
                              }
                              className="w-full px-2 py-1.5 border border-gray-200 rounded"
                            >
                              <option value="KES">KES</option>
                              <option value="USD">USD</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={opt.stock}
                              onChange={(e) =>
                                setProductForm((f) => ({
                                  ...f,
                                  variantOptions: (f.variantOptions ?? []).map((o, i) => (i === idx ? { ...o, stock: parseInt(e.target.value, 10) || 0 } : o)),
                                }))
                              }
                              className="w-full px-2 py-1.5 border border-gray-200 rounded"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setProductForm((f) => ({ ...f, variantOptions: (f.variantOptions ?? []).filter((_, i) => i !== idx) }))}
                              className="text-red-600 hover:underline text-xs"
                              aria-label="Remove"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProductForm((f) => ({
                      ...f,
                      variantOptions: [...(f.variantOptions ?? []), { name: '', price: '', currency: f.currency, stock: 0 }],
                    }))
                  }
                  className="mt-2 text-sm text-blue-600 hover:underline font-medium"
                >
                  + Add variant option
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select value={productForm.currency} onChange={(e) => setProductForm((f) => ({ ...f, currency: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="KES">KES (Kenyan Shilling)</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={productForm.status} onChange={(e) => setProductForm((f) => ({ ...f, status: e.target.value as 'draft' | 'published' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowProductForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveProduct} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {bulkResult && (
        <BulkResultModal
          title="Bulk import result"
          summary={bulkResult.summary}
          results={bulkResult.results}
          onClose={() => setBulkResult(null)}
        />
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" /></div>}>
      <CatalogContent />
    </Suspense>
  );
}
