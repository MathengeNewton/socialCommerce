'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import ShopHeader from './ShopHeader';

const BUDGET_RANGES = [
  { label: '0 - 500K', min: 0, max: 500000 },
  { label: '500K - 1M', min: 500000, max: 1000000 },
  { label: '1M - 2M', min: 1000000, max: 2000000 },
  { label: '2M - 3M', min: 2000000, max: 3000000 },
  { label: '3M - 5M', min: 3000000, max: 5000000 },
  { label: '5M - 10M', min: 5000000, max: 10000000 },
  { label: 'Above 10M', min: 10000000, max: undefined },
];

type Category = { id: string; name: string; slug: string };
type Supplier = { id: string; name: string };

type ProductsListingProps = {
  initialCategorySlug?: string | null;
  initialSearch?: string;
  initialMinPrice?: number;
  initialMaxPrice?: number;
};

export default function ProductsListing({
  initialCategorySlug = null,
  initialSearch = '',
  initialMinPrice,
  initialMaxPrice,
}: ProductsListingProps) {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const tenantId = useMemo(() => process.env.NEXT_PUBLIC_STORE_TENANT_ID || '00000000-0000-0000-0000-000000000001', []);

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [categorySlug, setCategorySlug] = useState<string | null>(initialCategorySlug ?? null);
  const [budgetRange, setBudgetRange] = useState<{ min: number; max?: number } | null>(
    initialMinPrice != null ? { min: initialMinPrice, max: initialMaxPrice } : null
  );
  const [supplierId, setSupplierId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 12 });

  useEffect(() => {
    if (initialCategorySlug !== undefined) setCategorySlug(initialCategorySlug);
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
      setSearchInput(initialSearch);
    }
    if (initialMinPrice != null) setBudgetRange({ min: initialMinPrice, max: initialMaxPrice });
  }, [initialCategorySlug, initialSearch, initialMinPrice, initialMaxPrice]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${apiUrl}/store/categories?tenantId=${tenantId}`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (e) {
        console.error('Failed to fetch categories', e);
      }
    };
    fetchCategories();
  }, [apiUrl, tenantId]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('tenantId', tenantId);
        params.set('page', String(page));
        params.set('limit', '12');
        if (search) params.set('search', search);
        if (categorySlug) params.set('categorySlug', categorySlug);
        if (budgetRange) {
          params.set('minPrice', String(budgetRange.min));
          if (budgetRange.max) params.set('maxPrice', String(budgetRange.max));
        }
        if (supplierId) params.set('supplierId', supplierId);

        const res = await fetch(`${apiUrl}/store/products?${params.toString()}`);
        const data = await res.json();
        setProducts(data.products || []);
        setPagination(data.pagination || { page: 1, total: 0, totalPages: 1, limit: 12 });
        if (data.products?.length) {
          const uniqueSuppliers = Array.from(
            new Map(data.products.map((p: any) => [p.supplier?.id, p.supplier]).filter(([, s]: [string, Supplier | undefined]) => s))
          ).map(([, s]) => s) as Supplier[];
          setSuppliers(uniqueSuppliers);
        }
      } catch (e) {
        console.error('Failed to fetch products', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [apiUrl, tenantId, page, search, categorySlug, budgetRange, supplierId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const num = (v: unknown): number =>
    typeof v === 'number' ? v : typeof v === 'object' && v != null && 'toString' in v ? Number((v as { toString(): string }).toString()) : Number(v);

  return (
    <div className="min-h-screen bg-shop-bg">
      <ShopHeader categories={categories} currentCategory={categorySlug || undefined} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav className="mb-6 text-sm text-shop-muted">
          <Link href="/" className="hover:text-shop-fg transition-colors">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/products" className="hover:text-shop-fg transition-colors">Products</Link>
          {categorySlug && (
            <>
              <span className="mx-2">›</span>
              <span className="text-shop-fg capitalize">{categorySlug.replace(/-/g, ' ')}</span>
            </>
          )}
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-72 shrink-0">
            <div className="bg-shop-card rounded-xl border border-shop-border p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-shop-fg mb-2">Search</h3>
                <p className="text-xs text-shop-muted mb-3">Search by product name</p>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search products..."
                    className="flex-1 px-3 py-2 bg-shop-bg border border-shop-border rounded-lg text-shop-fg placeholder-shop-muted focus:outline-none focus:ring-2 focus:ring-shop-accent"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-shop-accent text-white rounded-lg font-medium hover:bg-shop-accent-hover transition-colors"
                  >
                    Search
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-shop-fg mb-2">Filter by budget</h3>
                <div className="grid grid-cols-2 gap-2">
                  {BUDGET_RANGES.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => {
                        setBudgetRange(budgetRange?.min === range.min ? null : { min: range.min, max: range.max });
                        setPage(1);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        budgetRange?.min === range.min
                          ? 'bg-shop-accent text-white'
                          : 'bg-shop-bg text-shop-fg border border-shop-border hover:border-shop-muted'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-shop-fg mb-2">Category</h3>
                <div className="space-y-1">
                  <Link
                    href="/products"
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      !categorySlug ? 'bg-shop-accent/20 text-shop-accent' : 'text-shop-fg hover:bg-shop-border/50'
                    }`}
                  >
                    All
                  </Link>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/products/${cat.slug}`}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        categorySlug === cat.slug ? 'bg-shop-accent/20 text-shop-accent' : 'text-shop-fg hover:bg-shop-border/50'
                      }`}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>

              {suppliers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-shop-fg mb-2">Brand / Supplier</h3>
                  <select
                    value={supplierId}
                    onChange={(e) => { setSupplierId(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 bg-shop-bg border border-shop-border rounded-lg text-shop-fg focus:outline-none focus:ring-2 focus:ring-shop-accent"
                  >
                    <option value="">All</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-shop-fg">
                {categorySlug ? (categories.find((c) => c.slug === categorySlug)?.name || categorySlug) : 'All Products'}
              </h2>
              <p className="text-sm text-shop-muted">
                {pagination.total} {pagination.total === 1 ? 'product' : 'products'}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-shop-accent border-t-transparent" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24 bg-shop-card rounded-xl border border-shop-border">
                <p className="text-shop-muted mb-4">No products found</p>
                <Link
                  href="/products"
                  className="inline-block px-4 py-2 bg-shop-accent text-white rounded-lg font-medium hover:bg-shop-accent-hover transition-colors"
                >
                  Clear filters
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/p/${product.slug}`}
                      className="group bg-shop-card rounded-xl border border-shop-border overflow-hidden hover:border-shop-muted transition-all"
                    >
                      <div className="aspect-square bg-shop-bg relative overflow-hidden">
                        {product.images?.[0]?.media ? (
                          <img
                            src={product.images[0].media.url}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-shop-placeholder">
                            <svg className="w-14 h-14 text-shop-placeholder-fg mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                            </svg>
                            <span className="text-xs font-medium text-shop-placeholder-fg uppercase tracking-wider">
                              {product.title?.slice(0, 1) || '?'}
                            </span>
                          </div>
                        )}
                        <span className="absolute top-3 right-3 px-2 py-1 bg-green-500/90 text-white text-xs font-semibold rounded">
                          Available
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-shop-fg mb-1 line-clamp-1 group-hover:text-shop-accent transition-colors">
                          {product.title}
                        </h3>
                        <p className="text-sm text-shop-muted line-clamp-2 mb-3">{product.description}</p>
                        <p className="text-lg font-bold text-shop-fg">
                          {product.currency} {num(product.listPrice ?? product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        {product.priceDisclaimer && (
                          <p className="text-xs text-shop-muted mt-1">{product.priceDisclaimer}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-4 py-2 bg-shop-card border border-shop-border rounded-lg text-shop-fg font-medium hover:bg-shop-border/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-shop-muted">
                      Page {page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                      className="px-4 py-2 bg-shop-card border border-shop-border rounded-lg text-shop-fg font-medium hover:bg-shop-border/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
