'use client';

import Link from 'next/link';

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

function num(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value != null && typeof (value as { toString?: () => string }).toString === 'function') {
    return Number((value as { toString(): string }).toString());
  }
  return Number(value);
}

export default function FeaturedProductsSection({ products }: { products: Product[] }) {
  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-shop-muted">
            Featured products
          </p>
        </div>
        <Link
          href="/products"
          className="text-sm font-medium text-shop-accent transition-colors hover:text-shop-accent-hover"
        >
          View all products
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-[28px] border border-shop-border bg-shop-card px-6 py-12 text-center shadow-sm">
          <p className="text-lg font-semibold text-shop-fg">Featured products will appear here once curated.</p>
          <p className="mt-2 text-sm text-shop-muted">
            Use the admin catalog to mark products as featured and set their display order.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-shop-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-shop-accent-hover"
          >
            Browse all products
          </Link>
        </div>
      ) : (
        <div className="horizontal-scroll -mx-1 flex gap-5 overflow-x-auto pb-3 pl-1 pr-1 snap-x snap-mandatory">
          {products.map((product) => {
            const price = product.listPrice != null ? num(product.listPrice) : num(product.price);

            return (
              <article
                key={product.id}
                className="w-[280px] shrink-0 snap-start overflow-hidden rounded-[28px] border border-shop-border bg-shop-card shadow-sm transition-transform hover:-translate-y-1 sm:w-[320px]"
              >
                <Link href={`/p/${product.slug}`} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-shop-placeholder">
                    {product.images?.[0]?.media?.url ? (
                      <img
                        src={product.images[0].media.url}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl font-semibold text-shop-placeholder-fg">
                        {product.title.slice(0, 1)}
                      </div>
                    )}
                    {product.category?.name && (
                      <span className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                        {product.category.name}
                      </span>
                    )}
                  </div>
                </Link>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-shop-fg">{product.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-shop-muted">
                        {product.description || 'View the full product page for details and purchase options.'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm text-shop-muted">From</p>
                      <p className="text-lg font-semibold text-shop-fg">
                        {product.currency || 'KES'} {price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/p/${product.slug}`}
                      className="inline-flex items-center justify-center rounded-full bg-shop-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-shop-accent-hover"
                    >
                      View product
                    </Link>
                    <Link
                      href="/products"
                      className="inline-flex items-center justify-center rounded-full border border-shop-border px-4 py-2.5 text-sm font-semibold text-shop-fg transition-colors hover:border-shop-accent hover:text-shop-accent"
                    >
                      Browse more
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
