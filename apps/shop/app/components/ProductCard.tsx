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
};

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v != null && typeof (v as { toString?: () => string }).toString === 'function') {
    return Number((v as { toString(): string }).toString());
  }
  return Number(v);
}

export default function ProductCard({ product }: { product: Product }) {
  const price = product.listPrice != null ? num(product.listPrice) : product.price != null ? num(product.price) : 0;
  const currency = product.currency ?? 'KES';

  return (
    <Link
      href={`/p/${product.slug}`}
      className="group shrink-0 w-[160px] sm:w-[180px] flex flex-col bg-shop-card rounded-xl border border-shop-border overflow-hidden hover:border-shop-muted hover:shadow-lg transition-all duration-200 h-full"
    >
      {/* Fixed aspect image - same for every card */}
      <div className="w-full aspect-[3/4] bg-shop-bg relative overflow-hidden flex-shrink-0">
        {product.images?.[0]?.media ? (
          <img
            src={product.images[0].media.url}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-shop-placeholder">
            <svg className="w-10 h-10 text-shop-placeholder-fg mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
            </svg>
            <span className="text-xs font-medium text-shop-placeholder-fg uppercase">
              {product.title?.slice(0, 1) || '?'}
            </span>
          </div>
        )}
      </div>
      {/* Fixed-height footer - same for every card so row stays aligned */}
      <div className="p-3 min-h-[72px] flex flex-col justify-end flex-shrink-0">
        <h3 className="font-medium text-shop-fg text-sm line-clamp-2 group-hover:text-shop-accent transition-colors leading-tight">
          {product.title}
        </h3>
        <p className="text-sm font-semibold text-shop-fg mt-2">
          {currency} {price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>
    </Link>
  );
}
