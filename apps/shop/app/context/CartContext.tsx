'use client';

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';

const CART_TOKEN_KEY = 'shop_cart_token';

type CartItem = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: {
    id: string;
    title: string;
    slug: string;
    listPrice?: number;
    price?: number;
    currency: string;
    images?: Array<{ media: { url: string } }>;
  };
  variant?: { id: string; name: string } | null;
  price: number;
};

type Cart = {
  id: string;
  cartToken: string;
  items: CartItem[];
};

type CartContextValue = {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  addToCart: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function getOrCreateCartToken(): string {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem(CART_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(CART_TOKEN_KEY, token);
  }
  return token;
}

export function CartProvider({
  children,
  apiUrl,
  tenantId,
}: {
  children: React.ReactNode;
  apiUrl: string;
  tenantId: string;
}) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    const token = getOrCreateCartToken();
    if (!tenantId || !token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/store/cart?tenantId=${tenantId}&cartToken=${token}`);
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      } else {
        setCart(null);
      }
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, tenantId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = useCallback(
    async (productId: string, quantity: number, variantId?: string) => {
      const token = getOrCreateCartToken();
      const res = await fetch(`${apiUrl}/store/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          cartToken: token,
          productId,
          quantity,
          variantId: variantId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to add to cart');
      }
      await fetchCart();
    },
    [apiUrl, tenantId, fetchCart]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const token = getOrCreateCartToken();
      const res = await fetch(`${apiUrl}/store/cart/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          cartToken: token,
          itemId,
          quantity,
        }),
      });
      if (!res.ok) throw new Error('Failed to update cart');
      await fetchCart();
    },
    [apiUrl, tenantId, fetchCart]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const token = getOrCreateCartToken();
      const res = await fetch(
        `${apiUrl}/store/cart/remove?tenantId=${tenantId}&cartToken=${token}&itemId=${itemId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to remove item');
      await fetchCart();
    },
    [apiUrl, tenantId, fetchCart]
  );

  const itemCount = cart?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        itemCount,
        addToCart,
        updateQuantity,
        removeItem,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
