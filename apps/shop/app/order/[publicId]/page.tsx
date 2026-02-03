'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ShopHeader from '../../components/ShopHeader';

type OrderConfirmation = {
  publicId: string;
  status: string;
  total: number;
  currency: string;
  customerName: string;
  createdAt: string;
  items: { productName: string; quantity: number; price: number }[];
};

export default function OrderConfirmationPage() {
  const params = useParams();
  const publicId = params?.publicId as string;
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!publicId) return;

    const fetchOrder = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
        const response = await fetch(`${apiUrl}/store/orders/${encodeURIComponent(publicId)}`);
        if (!response.ok) {
          if (response.status === 404) setNotFound(true);
          return;
        }
        const data = await response.json();
        setOrder(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [publicId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-shop-bg flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-shop-accent border-t-transparent"></div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-shop-bg">
        <ShopHeader />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-shop-fg mb-2">Order not found</h1>
          <p className="text-shop-muted mb-6">
            We couldn&apos;t find an order with that reference. Please check the link or contact support.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-shop-accent text-white px-6 py-3 rounded-xl font-semibold hover:bg-shop-accent-hover"
          >
            Browse products
          </Link>
        </main>
      </div>
    );
  }

  const createdDate = new Date(order.createdAt).toLocaleDateString(undefined, {
    dateStyle: 'medium',
  });

  return (
    <div className="min-h-screen bg-shop-bg">
      <ShopHeader />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-shop-fg mb-2">We have received your order</h1>
          <p className="text-shop-muted mb-4">
            Thank you for your order. Here are the details for your reference.
          </p>
          <p className="text-shop-fg font-medium">
            Someone will be in touch shortly to confirm and arrange delivery or pickup.
          </p>
        </div>

        <div className="bg-shop-card rounded-2xl border border-shop-border overflow-hidden">
          <div className="px-6 py-6 border-b border-shop-border">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-shop-muted">Order reference</p>
                <p className="text-xl font-bold text-shop-fg">{order.publicId}</p>
              </div>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'pending'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                    : order.status === 'complete' || order.status === 'shipped'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-sm text-shop-muted mt-2">Placed on {createdDate}</p>
            {order.customerName && (
              <p className="text-sm text-shop-fg mt-1">Thank you, {order.customerName}.</p>
            )}
          </div>

          <div className="px-6 py-4">
            <h2 className="text-sm font-semibold text-shop-muted uppercase tracking-wide mb-3">
              Order summary
            </h2>
            <ul className="space-y-3">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-shop-fg">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-medium text-shop-fg">
                    {order.currency} {(item.price * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-6 py-4 bg-shop-bg border-t border-shop-border flex justify-between items-center">
            <span className="font-semibold text-shop-fg">Total</span>
            <span className="text-xl font-bold text-shop-fg">
              {order.currency} {order.total.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-shop-accent text-white px-6 py-3 rounded-xl font-semibold hover:bg-shop-accent-hover transition-colors"
          >
            Browse more products
          </Link>
        </div>
      </main>
    </div>
  );
}
