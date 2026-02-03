'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductsListing from '../components/ProductsListing';

function ProductsContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const cat = searchParams.get('cat') ?? null;
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');

  return (
    <ProductsListing
      initialSearch={q}
      initialCategorySlug={cat}
      initialMinPrice={minPrice ? parseFloat(minPrice) : undefined}
      initialMaxPrice={maxPrice ? parseFloat(maxPrice) : undefined}
    />
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-shop-bg flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-2 border-shop-accent border-t-transparent" /></div>}>
      <ProductsContent />
    </Suspense>
  );
}
