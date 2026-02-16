'use client';

import { useState } from 'react';
import Link from 'next/link';
import ShopHeader from '../components/ShopHeader';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function CartPage() {
  const { cart, loading, updateQuantity, removeItem } = useCart();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const currency = items[0]?.product?.currency ?? 'KES';

  if (loading) {
    return (
      <div className="min-h-screen bg-shop-bg">
        <ShopHeader />
        <main className="max-w-4xl mx-auto px-4 py-12 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-shop-accent border-t-transparent" />
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-shop-bg">
        <ShopHeader />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-shop-card rounded-2xl border border-shop-border overflow-hidden">
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-shop-accent/10 rounded-3xl mb-6">
                <svg className="w-12 h-12 text-shop-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-shop-fg mb-3">Your cart is empty</h2>
              <p className="text-shop-muted mb-8 max-w-md mx-auto">
                Looks like you haven&apos;t added anything to your cart yet. Start shopping to fill it up!
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-shop-accent text-white px-8 py-4 rounded-xl font-semibold hover:bg-shop-accent-hover transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Browse Products</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-shop-bg">
      <ShopHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold text-shop-fg mb-6">Your Cart</h1>

        <div className="bg-shop-card rounded-2xl border border-shop-border overflow-hidden">
          <ul className="divide-y divide-shop-border">
            {items.map((item) => {
              const currency = item.variant?.currency && String(item.variant.currency).trim() ? String(item.variant.currency) : item.product.currency;
              const unitPrice = item.price;
              const lineTotal = unitPrice * item.quantity;
              return (
              <li key={item.id} className="flex gap-4 p-4 sm:p-6">
                <div className="w-20 h-20 shrink-0 bg-shop-placeholder rounded-xl flex items-center justify-center overflow-hidden">
                  {item.product.images?.[0]?.media?.url ? (
                    <img src={item.product.images[0].media.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-shop-placeholder-fg font-semibold text-lg">
                      {item.product.title?.slice(0, 1) || '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/p/${item.product.slug}`} className="font-semibold text-shop-fg hover:text-shop-accent truncate block">
                    {item.product.title}
                  </Link>
                  {item.variant && (
                    <p className="text-sm font-medium text-shop-fg mt-1">
                      Variant: {item.variant.name}
                      {item.variant.sku && <span className="text-shop-muted font-normal ml-1">({item.variant.sku})</span>}
                    </p>
                  )}
                  <p className="text-shop-muted text-sm mt-0.5">
                    {currency} {Number(unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })} each × {item.quantity} = {currency} {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 border border-shop-border rounded-lg">
                    <button
                      type="button"
                      disabled={updatingId === item.id}
                      onClick={async () => {
                        const newQty = item.quantity - 1;
                        setUpdatingId(item.id);
                        try {
                          await updateQuantity(item.id, newQty <= 0 ? 0 : newQty);
                        } catch (e) {
                          toast(e instanceof Error ? e.message : 'Failed to update quantity', 'error');
                        } finally {
                          setUpdatingId(null);
                        }
                      }}
                      className="w-8 h-8 flex items-center justify-center text-shop-fg hover:bg-shop-border/50 rounded-l-md disabled:opacity-50"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      disabled={updatingId === item.id}
                      onClick={async () => {
                        setUpdatingId(item.id);
                        try {
                          await updateQuantity(item.id, item.quantity + 1);
                        } catch (e) {
                          toast(e instanceof Error ? e.message : 'Failed to update quantity', 'error');
                        } finally {
                          setUpdatingId(null);
                        }
                      }}
                      className="w-8 h-8 flex items-center justify-center text-shop-fg hover:bg-shop-border/50 rounded-r-md disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={updatingId === item.id}
                    onClick={async () => {
                      setUpdatingId(item.id);
                      try {
                        await removeItem(item.id);
                      } catch (e) {
                        toast(e instanceof Error ? e.message : 'Failed to remove item', 'error');
                      } finally {
                        setUpdatingId(null);
                      }
                    }}
                    className="text-xs text-red-600 hover:text-red-500 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
            })}
          </ul>

          <div className="p-4 sm:p-6 border-t border-shop-border flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <p className="text-lg font-bold text-shop-fg">
              Total: {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <Link
              href="/checkout"
              className="inline-flex justify-center items-center bg-shop-accent text-white px-8 py-3 rounded-xl font-semibold hover:bg-shop-accent-hover transition-colors"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
