'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
const OVERLAP = 120;

export default function OverlappingHeroRow({ products }: { products: Product[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inSection = sectionRef.current?.contains(target);
      const inOverlay = overlayRef.current?.contains(target);
      if (!inSection && !inOverlay) setSelectedId(null);
    };
    window.addEventListener('keydown', handleEscape);
    document.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const selectedProduct = selectedId ? products.find((p) => p.id === selectedId) : null;

  // Lock body scroll when overlay is open so no page scrollbars
  useEffect(() => {
    if (!selectedId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedId]);

  if (products.length === 0) return null;

  const overlayEl =
    mounted && selectedProduct ? (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-5 bg-black/50 overflow-hidden"
        style={{ height: '100dvh', width: '100vw' }}
        onClick={() => setSelectedId(null)}
        role="presentation"
      >
        <div
          className="flex items-center justify-center overflow-hidden rounded-xl w-full max-h-[92dvh] max-w-[420px]"
          style={{ maxWidth: 'min(420px, calc(100vw - 2rem))' }}
          onClick={(e) => e.stopPropagation()}
        >
          <OverlappingCard
            product={selectedProduct}
            size="hero"
            isSelected
            onSelect={() => {}}
            onDeselect={() => setSelectedId(null)}
            width={400}
            overlayMode
          />
        </div>
      </div>
    ) : null;

  return (
    <>
      <section ref={sectionRef} className="min-h-[70vh] flex flex-col justify-center pt-10 sm:pt-14 pb-12 sm:pb-16 overflow-visible" aria-label="Featured products">
        <div
          className="horizontal-scroll overflow-x-auto overflow-y-visible scroll-smooth pb-2 snap-x snap-mandatory"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-stretch pl-2 pr-2 sm:pl-4 sm:pr-4">
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
                <div className="h-full min-h-[420px]">
                  <OverlappingCard
                    product={product}
                    size="hero"
                    isSelected={false}
                    onSelect={() => setSelectedId(product.id)}
                    onDeselect={() => setSelectedId(null)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {mounted && overlayEl ? createPortal(overlayEl, document.body) : null}
    </>
  );
}
