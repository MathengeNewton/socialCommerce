'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ShopHeader from '../components/ShopHeader';
import { useCart } from '../context/CartContext';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, loading } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [address, setAddress] = useState('');
  const [preference, setPreference] = useState('');

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const tenantId = useMemo(() => process.env.NEXT_PUBLIC_STORE_TENANT_ID || '00000000-0000-0000-0000-000000000001', []);

  const items = cart?.items ?? [];
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const currency = items[0]?.product?.currency ?? 'KES';

  const cartToken = typeof window !== 'undefined' ? localStorage.getItem('shop_cart_token') : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (items.length === 0) {
      setError('Your cart is empty');
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/store/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          cartToken,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim() || undefined,
          customerAddress: deliveryType === 'delivery' ? address.trim() || undefined : undefined,
          deliveryType,
          customerPreference: preference.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Order failed');
      router.push(`/order/${data.publicId}`);
    } catch (e) {
      setError((e as Error).message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-shop-bg">
        <ShopHeader />
        <main className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-shop-accent border-t-transparent" />
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-shop-bg">
        <ShopHeader />
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-shop-muted mb-4">Your cart is empty.</p>
          <Link href="/products" className="text-shop-accent hover:underline font-medium">
            Browse products
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-shop-bg">
      <ShopHeader />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-shop-fg mb-6">Checkout</h1>

        <div className="bg-shop-card rounded-xl border border-shop-border p-6 mb-6">
          <h2 className="font-semibold text-shop-fg mb-3">Order summary</h2>
          <ul className="space-y-2 mb-4">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-shop-fg">
                  {item.product.title} × {item.quantity}
                </span>
                <span className="text-shop-muted">
                  {currency} {(item.price * item.quantity).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
          <p className="font-bold text-shop-fg border-t border-shop-border pt-3">
            Total: {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-shop-fg mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-shop-border bg-shop-bg text-shop-fg focus:ring-2 focus:ring-shop-accent focus:border-transparent"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-shop-fg mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-shop-border bg-shop-bg text-shop-fg focus:ring-2 focus:ring-shop-accent focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-shop-fg mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-shop-border bg-shop-bg text-shop-fg focus:ring-2 focus:ring-shop-accent focus:border-transparent"
              placeholder="+254..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-shop-fg mb-2">Delivery preference</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deliveryType"
                  checked={deliveryType === 'pickup'}
                  onChange={() => setDeliveryType('pickup')}
                  className="text-shop-accent"
                />
                <span className="text-shop-fg">Pick up at shop</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deliveryType"
                  checked={deliveryType === 'delivery'}
                  onChange={() => setDeliveryType('delivery')}
                  className="text-shop-accent"
                />
                <span className="text-shop-fg">Delivery to home</span>
              </label>
            </div>
          </div>

          {deliveryType === 'delivery' && (
            <div>
              <label className="block text-sm font-medium text-shop-fg mb-1">Delivery address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-shop-border bg-shop-bg text-shop-fg focus:ring-2 focus:ring-shop-accent focus:border-transparent"
                placeholder="Street, area, city..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-shop-fg mb-1">Notes / preferences</label>
            <textarea
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-lg border border-shop-border bg-shop-bg text-shop-fg focus:ring-2 focus:ring-shop-accent focus:border-transparent"
              placeholder="Any special requests..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-shop-accent text-white py-4 rounded-xl font-semibold hover:bg-shop-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
        </form>
      </main>
    </div>
  );
}
