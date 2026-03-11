'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ShopHeader from './components/ShopHeader';
import HomeHero from './components/HomeHero';
import PackagesSection from './components/PackagesSection';
import FeaturedProductsSection from './components/FeaturedProductsSection';

type Product = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  listPrice?: unknown;
  price?: unknown;
  currency?: string;
  images?: Array<{ media?: { url: string } }>;
  category?: { id: string; name: string; slug: string } | null;
};

type ServicePackage = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  priceLabel: string;
  cadence?: string | null;
  features: string[];
  ctaLabel: string;
};

type HomeSettings = {
  heroImageMediaId: string | null;
  heroImage: { id: string; url: string } | null;
};

export default function HomePage() {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const tenantId = useMemo(() => process.env.NEXT_PUBLIC_STORE_TENANT_ID || '00000000-0000-0000-0000-000000000001', []);

  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [homeSettings, setHomeSettings] = useState<HomeSettings>({
    heroImageMediaId: null,
    heroImage: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      setLoading(true);
      try {
        const [featuredRes, packagesRes, settingsRes] = await Promise.all([
          fetch(`${apiUrl}/store/products/featured?tenantId=${tenantId}&limit=6`),
          fetch(`${apiUrl}/store/packages?tenantId=${tenantId}`),
          fetch(`${apiUrl}/store/home-settings?tenantId=${tenantId}`),
        ]);

        if (featuredRes.ok) {
          const data = await featuredRes.json();
          setFeaturedProducts(Array.isArray(data) ? data : []);
        } else {
          setFeaturedProducts([]);
        }

        if (packagesRes.ok) {
          const data = await packagesRes.json();
          setPackages(Array.isArray(data) ? data : []);
        } else {
          setPackages([]);
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setHomeSettings({
            heroImageMediaId: data?.heroImageMediaId ?? null,
            heroImage: data?.heroImage ?? null,
          });
        } else {
          setHomeSettings({ heroImageMediaId: null, heroImage: null });
        }
      } catch (e) {
        console.error('Failed to fetch homepage data', e);
        setFeaturedProducts([]);
        setPackages([]);
        setHomeSettings({ heroImageMediaId: null, heroImage: null });
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, [apiUrl, tenantId]);

  return (
    <div className="min-h-screen bg-shop-bg flex flex-col">
      <ShopHeader />

      <main className="flex-1 pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
          <HomeHero
            featuredProduct={featuredProducts[0]}
            heroImageUrl={homeSettings.heroImage?.url}
          />

          {loading && (
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-shop-border bg-shop-card px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-shop-muted">
                <span className="h-2 w-2 animate-pulse rounded-full bg-shop-accent" />
                Refreshing homepage content
              </span>
            </div>
          )}

          <PackagesSection packages={packages} />
          <FeaturedProductsSection products={featuredProducts} />

          {!loading && packages.length === 0 && featuredProducts.length === 0 && (
            <div className="rounded-[28px] border border-shop-border bg-shop-card px-6 py-16 text-center">
              <p className="mb-4 text-shop-muted">
                No homepage content is published yet. Check back soon.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/products"
                  className="inline-block rounded-full bg-shop-accent px-5 py-2.5 font-medium text-white hover:bg-shop-accent-hover"
                >
                  Browse products
                </Link>
                <Link
                  href="/contact"
                  className="inline-block rounded-full border border-shop-border px-5 py-2.5 font-medium text-shop-fg hover:border-shop-accent hover:text-shop-accent"
                >
                  Contact us
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
