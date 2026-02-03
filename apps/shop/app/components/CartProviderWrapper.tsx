'use client';

import { CartProvider } from '../context/CartContext';

export default function CartProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
  const tenantId = process.env.NEXT_PUBLIC_STORE_TENANT_ID || '00000000-0000-0000-0000-000000000001';

  return (
    <CartProvider apiUrl={apiUrl} tenantId={tenantId}>
      {children}
    </CartProvider>
  );
}
