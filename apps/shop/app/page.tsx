'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ShopHeader from './components/ShopHeader';

const PRICE_RANGES = [
  { label: 'All', min: undefined, max: undefined },
  { label: '0 - 50K', min: 0, max: 50000 },
  { label: '50K - 100K', min: 50000, max: 100000 },
  { label: '100K - 500K', min: 100000, max: 500000 },
  { label: '500K+', min: 500000, max: undefined },
];

export default function HomePage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const tenantId = useMemo(() => process.env.NEXT_PUBLIC_STORE_TENANT_ID || '00000000-0000-0000-0000-000000000001', []);

  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; productCount?: number }[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number } | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${apiUrl}/store/categories?tenantId=${tenantId}&withProductCount=true`);
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

  const topCategories = useMemo(
    () => [...categories].sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0)).slice(0, 2),
    [categories]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set('q', searchInput.trim());
    if (categorySlug) params.set('cat', categorySlug);
    if (priceRange?.min !== undefined) params.set('minPrice', String(priceRange.min));
    if (priceRange?.max !== undefined) params.set('maxPrice', String(priceRange.max));
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-shop-bg flex flex-col">
      <ShopHeader categories={categories} />

      <main className="flex-1">
        {/* Hero - KAI & KARO style dark, minimalist */}
        <section className="relative py-20 sm:py-28 overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-shop-fg mb-6 tracking-tight">
              Kenya&apos;s <span className="font-extrabold">largest</span> product marketplace
            </h1>
            <p className="text-lg sm:text-xl text-shop-muted mb-10 max-w-2xl mx-auto">
              Discover and shop from our curated collection
            </p>

            {/* Explore categories + top 2 categories */}
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <Link
                href="/categories"
                className="inline-flex items-center gap-2 px-6 py-3 bg-shop-fg text-shop-bg font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Explore categories
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              {topCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products/${cat.slug}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-shop-card border border-shop-border text-shop-fg font-medium rounded-lg hover:border-shop-muted transition-colors"
                >
                  {cat.name}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Link>
              ))}
            </div>

            {/* Search + filters */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search products by name..."
                  className="flex-1 px-4 py-3 bg-shop-card border border-shop-border rounded-lg text-shop-fg placeholder-shop-muted focus:outline-none focus:ring-2 focus:ring-shop-accent focus:border-transparent"
                />
                <select
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  className="px-4 py-3 bg-shop-card border border-shop-border rounded-lg text-shop-fg focus:outline-none focus:ring-2 focus:ring-shop-accent"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={priceRange ? `${priceRange.min ?? ''}-${priceRange.max ?? ''}` : 'all'}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v || v === 'all') {
                      setPriceRange(null);
                      return;
                    }
                    const [min, max] = v.split('-').map((x) => (x ? parseInt(x, 10) : undefined));
                    setPriceRange({ min, max });
                  }}
                  className="px-4 py-3 bg-shop-card border border-shop-border rounded-lg text-shop-fg focus:outline-none focus:ring-2 focus:ring-shop-accent"
                >
                  {PRICE_RANGES.map((r) => (
                    <option key={r.label} value={r.label === 'All' ? 'all' : `${r.min ?? ''}-${r.max ?? ''}`}>
                      {r.label === 'All' ? 'Price range' : r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-6 py-3 bg-shop-accent text-white font-semibold rounded-lg hover:bg-shop-accent-hover transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
