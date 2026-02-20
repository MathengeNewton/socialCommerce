'use client';

import { useState, useEffect } from 'react';
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

const CARD_WIDTH = 160;
const OVERLAP = 70;

type OverlappingCategoryRowProps = {
  sectionId: string;
  title: string;
  products: Product[];
};

export default function OverlappingCategoryRow({ sectionId, title, products }: OverlappingCategoryRowProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <section id={sectionId} className="mb-10 scroll-mt-24" aria-labelledby={`${sectionId}-title`}>
      <div className="mb-4 px-4 sm:px-6 lg:px-8">
        <h2 id={`${sectionId}-title`} className="text-xl font-bold text-shop-fg">
          {title}
        </h2>
      </div>
      <div
        className="horizontal-scroll overflow-x-auto overflow-y-visible scroll-smooth pb-2 snap-x snap-mandatory"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-stretch pl-4 sm:pl-6 lg:pl-8 pr-4 sm:pr-6 lg:pr-8">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="shrink-0 snap-start"
              style={{
                marginLeft: index === 0 ? 0 : -OVERLAP,
                width: CARD_WIDTH,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-full min-h-[260px]">
                <OverlappingCard
                  product={product}
                  size="category"
                  isSelected={selectedId === product.id}
                  onSelect={() => setSelectedId(product.id)}
                  onDeselect={() => setSelectedId(null)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
