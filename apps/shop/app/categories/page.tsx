'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import ShopHeader from '../components/ShopHeader';

type Category = { id: string; name: string; slug: string; productCount?: number };
type Product = {
  id: string;
  title: string;
  slug: string;
  description: string;
  listPrice?: number;
  price?: number;
  currency: string;
  images?: Array<{ media: { url: string } }>;
  category?: { slug: string };
};

export default function CategoriesPage() {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const tenantId = useMemo(() => process.env.NEXT_PUBLIC_STORE_TENANT_ID || '00000000-0000-0000-0000-000000000001', []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [productsByCategory, setProductsByCategory] = useState<Record<string, Product[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${apiUrl}/store/categories?tenantId=${tenantId}&withProductCount=true`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          if (data.length > 0 && !activeTab) {
            setActiveTab(data[0].slug);
          }
        }
      } catch (e) {
        console.error('Failed to fetch categories', e);
      }
    };
    fetchCategories();
  }, [apiUrl, tenantId]);

  useEffect(() => {
    if (!activeTab) return;
    const fetchProducts = async () => {
      setLoading((prev) => ({ ...prev, [activeTab]: true }));
      try {
        const res = await fetch(
          `${apiUrl}/store/products?tenantId=${tenantId}&categorySlug=${activeTab}&limit=100`
        );
        if (res.ok) {
          const data = await res.json();
          setProductsByCategory((prev) => ({ ...prev, [activeTab]: data.products || [] }));
        }
      } catch (e) {
        console.error('Failed to fetch products', e);
      } finally {
        setLoading((prev) => ({ ...prev, [activeTab]: false }));
      }
    };
    fetchProducts();
  }, [activeTab, apiUrl, tenantId]);

  const num = (v: unknown): number =>
    typeof v === 'number' ? v : typeof v === 'object' && v != null && 'toString' in v ? Number((v as { toString(): string }).toString()) : Number(v);

  const products = activeTab ? (productsByCategory[activeTab] ?? []) : [];
  const isLoading = activeTab ? (loading[activeTab] ?? false) : false;

  return (
    <div className="min-h-screen bg-shop-bg flex flex-col">
      <ShopHeader categories={categories} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <nav className="mb-6 text-sm text-shop-muted">
          <Link href="/" className="hover:text-shop-fg transition-colors">Home</Link>
          <span className="mx-2">›</span>
          <span className="text-shop-fg">Categories</span>
        </nav>

        <h1 className="text-2xl font-bold text-shop-fg mb-6">Explore categories</h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-shop-border pb-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.slug)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === cat.slug
                  ? 'bg-shop-accent text-white'
                  : 'bg-shop-card border border-shop-border text-shop-fg hover:border-shop-muted'
              }`}
            >
              {cat.name}
              {cat.productCount != null && (
                <span className="ml-2 text-sm opacity-80">({cat.productCount})</span>
              )}
            </button>
          ))}
        </div>

        {/* Products list for active category */}
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-shop-accent border-t-transparent" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 bg-shop-card rounded-xl border border-shop-border">
            <p className="text-shop-muted mb-4">No products in this category yet</p>
            <Link
              href="/products"
              className="inline-block px-4 py-2 bg-shop-accent text-white rounded-lg font-medium hover:bg-shop-accent-hover transition-colors"
            >
              Browse all products
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/p/${product.slug}`}
                  className="flex gap-4 p-4 bg-shop-card rounded-xl border border-shop-border hover:border-shop-muted transition-colors"
                >
                  <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-shop-placeholder flex items-center justify-center">
                    {product.images?.[0]?.media ? (
                      <img
                        src={product.images[0].media.url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-shop-placeholder-fg">
                        {product.title?.slice(0, 1) || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-shop-fg">{product.title}</h3>
                    <p className="text-sm text-shop-muted line-clamp-2 mt-1">{product.description}</p>
                    <p className="text-lg font-bold text-shop-fg mt-2">
                      {product.currency} {num(product.listPrice ?? product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center">
                    <span className="text-shop-muted">View →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
