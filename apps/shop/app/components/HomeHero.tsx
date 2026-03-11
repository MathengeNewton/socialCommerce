'use client';

import Link from 'next/link';

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

type ServicePackage = {
  id: string;
  name: string;
  priceLabel: string;
  cadence?: string | null;
  shortDescription: string;
  ctaLabel: string;
};

export default function HomeHero({
  featuredProduct,
  heroImageUrl,
}: {
  featuredProduct?: Product;
  heroImageUrl?: string;
}) {
  const featuredImage = heroImageUrl || featuredProduct?.images?.[0]?.media?.url;

  return (
    <section className="relative isolate overflow-hidden rounded-[36px] border border-shop-border bg-shop-card shadow-[0_30px_80px_rgba(15,23,42,0.14)]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.12),transparent_26%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.3),rgba(0,0,0,0.95),transparent)]" />

      <div className="relative grid gap-10 px-6 py-10 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-14 lg:px-12 lg:py-16">
        <div className="max-w-2xl self-center">
          <p className="mb-5 inline-flex items-center rounded-full border border-shop-border bg-shop-bg/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-shop-muted">
            Social media management + curated electronics
          </p>

          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-shop-fg sm:text-5xl lg:text-6xl">
            Sell smarter, grow faster, and shop featured tech in one clean place.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-shop-muted sm:text-lg">
            Hour shop helps businesses grow online through practical social media management, while
            also offering a curated selection of featured electronics.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full bg-shop-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-shop-accent-hover"
            >
              Shop products
            </Link>
            <Link
              href="/#packages"
              className="inline-flex items-center justify-center rounded-full border border-shop-border bg-shop-bg/70 px-6 py-3.5 text-sm font-semibold text-shop-fg transition-colors hover:border-shop-accent hover:text-shop-accent"
            >
              View packages
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full px-2 py-3.5 text-sm font-medium text-shop-muted transition-colors hover:text-shop-fg"
            >
              Contact us
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-shop-muted">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-shop-accent" />
              Social media support
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-shop-accent" />
              Clear monthly packages
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-shop-accent" />
              Curated featured products
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative min-h-[320px] overflow-hidden rounded-[30px] border border-white/10 bg-slate-950 shadow-[0_20px_50px_rgba(15,23,42,0.22)] sm:min-h-[420px]">
            {featuredImage ? (
              <img
                src={featuredImage}
                alt={featuredProduct?.title || 'Hero image'}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.20),transparent_26%),linear-gradient(145deg,#08111f,#111f39_55%,#172a46)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/20 via-transparent to-white/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
