'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import ShopHeader from './components/ShopHeader';
import OverlappingHeroRow from './components/OverlappingHeroRow';
import OverlappingCategoryRow from './components/OverlappingCategoryRow';

type Category = { id: string; name: string; slug: string; productCount?: number };
type Product = {
  id: string;
  slug: string;
  title: string;
  listPrice?: unknown;
  price?: unknown;
  currency?: string;
  images?: Array<{ media?: { url: string } }>;
  category?: { id: string; name: string; slug: string } | null;
};

export default function HomePage() {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const tenantId = useMemo(() => process.env.NEXT_PUBLIC_STORE_TENANT_ID || '00000000-0000-0000-0000-000000000001', []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${apiUrl}/store/categories?tenantId=${tenantId}&withProductCount=true`);
        if (res.ok) {
          const data = await res.json();
          setCategories(Array.isArray(data) ? data : []);
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
        const res = await fetch(
          `${apiUrl}/store/products?tenantId=${tenantId}&limit=60&page=1`
        );
        const data = await res.json();
        setProducts(data.products ?? []);
      } catch (e) {
        console.error('Failed to fetch products', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [apiUrl, tenantId]);

  const heroProducts = useMemo(() => products.slice(0, 10), [products]);

  /** One section per category; only include categories that have at least one product */
  const categorySectionsWithProducts = useMemo(() => {
    return categories
      .map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        products: products.filter((p) => p.category?.slug === cat.slug),
      }))
      .filter((section) => section.products.length > 0);
  }, [categories, products]);

  const scrollToCategory = (slug: string) => {
    const el = document.getElementById(`category-${slug}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-shop-bg flex flex-col">
      <ShopHeader categories={categories} />

      <main className="flex-1 pb-12 px-5 sm:px-8 lg:px-12">
        {/* Overlapping hero row - first section */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-shop-accent border-t-transparent" />
          </div>
        ) : (
          <>
            <OverlappingHeroRow products={heroProducts} />
            {categorySectionsWithProducts.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-medium text-shop-muted uppercase tracking-wider mb-2">Browse by category</p>
                <div className="horizontal-scroll flex gap-2 pb-2">
                  {categorySectionsWithProducts.map((section) => (
                    <button
                      key={section.slug}
                      type="button"
                      onClick={() => scrollToCategory(section.slug)}
                      className="shrink-0 px-4 py-2 rounded-full bg-shop-card/80 border border-shop-border text-sm text-shop-fg hover:border-shop-accent hover:text-shop-accent transition-colors"
                    >
                      {section.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {categorySectionsWithProducts.map((section) => (
              <OverlappingCategoryRow
                key={section.slug}
                sectionId={`category-${section.slug}`}
                title={section.name}
                products={section.products}
              />
            ))}

            {!loading && products.length === 0 && (
              <div className="text-center py-16 px-4">
                <p className="text-shop-muted mb-4">No products yet. Check back soon.</p>
                <Link
                  href="/products"
                  className="inline-block px-5 py-2.5 bg-shop-accent text-white font-medium rounded-lg hover:bg-shop-accent-hover"
                >
                  Browse products
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
