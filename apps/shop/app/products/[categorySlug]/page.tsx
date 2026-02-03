'use client';

import { useParams } from 'next/navigation';
import ProductsListing from '../../components/ProductsListing';

export default function CategoryProductsPage() {
  const params = useParams();
  const categorySlug = params.categorySlug as string;

  return <ProductsListing initialCategorySlug={categorySlug} />;
}
