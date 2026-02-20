'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

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

type OverlappingCardProps = {
  product: Product;
  size: 'hero' | 'category';
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  /** When set, overrides the default width (e.g. for overlay) */
  width?: number;
  /** In overlay: no scale, card fits viewport with no scroll */
  overlayMode?: boolean;
};

export default function OverlappingCard({ product, size, isSelected, onSelect, onDeselect, width: widthProp, overlayMode }: OverlappingCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const price = product.listPrice != null ? num(product.listPrice) : product.price != null ? num(product.price) : 0;
  const currency = product.currency ?? 'KES';

  const isHero = size === 'hero';

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
  };

  const handleViewMore = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeselect();
    router.push(`/p/${product.slug}`);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addToCart(product.id, 1);
      toast('Added to cart', 'success');
    } catch (err) {
      toast((err as Error).message || 'Failed to add to cart', 'error');
    }
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addToCart(product.id, 1);
      onDeselect();
      router.push('/checkout');
    } catch (err) {
      toast((err as Error).message || 'Failed to add to cart', 'error');
    }
  };

  const cardWidth = widthProp ?? (isHero ? 300 : 160);
  const minHeight = isHero ? 420 : 260;
  const isSelectedHero = isHero && isSelected;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className={`
        relative shrink-0 flex flex-col bg-shop-card rounded-xl border overflow-hidden
        transition-all duration-200 h-full
        ${isSelected && !overlayMode ? 'border-shop-accent ring-2 ring-shop-accent scale-105 z-20 shadow-xl' : isSelected ? 'border-shop-accent ring-2 ring-shop-accent z-20 shadow-xl' : 'border-shop-border hover:border-shop-muted hover:shadow-lg'}
        ${overlayMode ? 'max-h-[92dvh]' : isSelectedHero ? 'max-h-[85vh]' : ''}
      `}
      style={{
        width: cardWidth,
        minHeight: overlayMode ? 420 : isSelectedHero ? 520 : minHeight,
      }}
    >
      <div className={`w-full flex-1 flex flex-col min-h-0 ${isSelectedHero ? 'overflow-y-auto' : ''}`}>
        <div className={`w-full bg-shop-bg relative overflow-hidden flex-shrink-0 ${isHero ? 'aspect-[3/4]' : 'aspect-[3/4]'}`}>
          {product.images?.[0]?.media ? (
            <img
              src={product.images[0].media.url}
              alt={product.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-shop-placeholder">
              <span className="text-2xl text-shop-placeholder-fg font-medium uppercase">
                {product.title?.slice(0, 1) || '?'}
              </span>
            </div>
          )}
        </div>
        <div className={`flex flex-col justify-end flex-shrink-0 ${isHero ? 'p-4 min-h-[88px]' : 'p-3 min-h-[72px]'}`}>
          <h3 className={`font-medium text-shop-fg line-clamp-2 leading-tight ${isHero ? 'text-lg' : 'text-sm'}`}>
            {product.title}
          </h3>
          <p className={`font-semibold text-shop-fg mt-1 ${isHero ? 'text-base' : 'text-sm'}`}>
            {currency} {price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {isSelected && (
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col rounded-b-xl border-t border-shop-border bg-shop-card shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-2 flex items-center gap-1.5">
            <Link
              href={`/p/${product.slug}`}
              onClick={handleViewMore}
              className="flex-1 min-w-0 py-2 rounded-md border border-shop-border bg-shop-bg text-shop-fg text-xs font-medium hover:border-shop-accent hover:text-shop-accent text-center transition-colors"
            >
              View more
            </Link>
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 min-w-0 py-2 rounded-md bg-shop-accent text-white text-xs font-medium hover:bg-shop-accent-hover transition-colors"
            >
              Add to cart
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="flex-1 min-w-0 py-2 rounded-md bg-shop-fg text-shop-bg text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Buy now
            </button>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDeselect(); }}
            className="py-1 text-[10px] text-shop-muted hover:text-shop-fg uppercase tracking-wider"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
