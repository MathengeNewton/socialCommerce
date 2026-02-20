'use client';

import { useState, useEffect, useRef } from 'react';
import OverlappingCard from './OverlappingCard';

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

const CARD_WIDTH = 300;
const CARD_WIDTH_SELECTED = 316; // just a few pixels wider when selected
const OVERLAP = 120;
const CARD_HEIGHT = 420;
const CARD_HEIGHT_SELECTED = 436; // a few pixels up/down when selected

export default function OverlappingHeroRow({ products }: { products: Product[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) setSelectedId(null);
    };
    window.addEventListener('keydown', handleEscape);
    document.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Scroll selected card into view so the top isn't clipped when it grows
  useEffect(() => {
    if (!selectedId || !selectedRef.current) return;
    const t = requestAnimationFrame(() => {
      selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'center' });
    });
    return () => cancelAnimationFrame(t);
  }, [selectedId]);

  if (products.length === 0) return null;

  return (
    <section ref={sectionRef} className="min-h-[70vh] flex flex-col justify-center pt-10 sm:pt-14 pb-12 sm:pb-16 w-full overflow-visible" aria-label="Featured products">
      <p className="text-xs font-medium uppercase tracking-wider text-shop-muted pl-2 sm:pl-4 mb-2">
        Featured Products
      </p>
      <div
        className="horizontal-scroll hero-scroll overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory w-full min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* items-start: only the selected card grows in height; others stay fixed (no stretch) */}
        <div className="flex items-start pl-2 pr-2 sm:pl-4 sm:pr-4 gap-0">
          {products.map((product, index) => {
            const isSelected = selectedId === product.id;
            const w = isSelected ? CARD_WIDTH_SELECTED : CARD_WIDTH;
            return (
              <div
                key={product.id}
                ref={isSelected ? selectedRef : undefined}
                className="shrink-0 snap-start transition-[margin,width] duration-300 ease-out flex items-start"
                style={{
                  marginLeft: index === 0 ? 0 : -OVERLAP,
                  width: w,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full" style={{ minHeight: isSelected ? CARD_HEIGHT_SELECTED : CARD_HEIGHT }}>
                  <OverlappingCard
                    product={product}
                    size="hero"
                    isSelected={isSelected}
                    onSelect={() => setSelectedId(product.id)}
                    onDeselect={() => setSelectedId(null)}
                    width={isSelected ? CARD_WIDTH_SELECTED - 4 : undefined}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
