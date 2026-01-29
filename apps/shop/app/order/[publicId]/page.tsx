'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link href="/" className="text-blue-600 hover:underline">
              Back to home
            </Link>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order not found</h1>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t find an order with that reference. Please check the link or contact support.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Order confirmation
              </h1>
            </Link>
            <Link href="/products" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
              Continue shopping
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Order reference</p>
                <p className="text-xl font-bold text-gray-900">{order.publicId}</p>
              </div>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'pending'
                    ? 'bg-amber-100 text-amber-800'
                    : order.status === 'complete' || order.status === 'shipped'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Placed on {createdDate}</p>
            {order.customerName && (
              <p className="text-sm text-gray-600 mt-1">Thank you, {order.customerName}.</p>
            )}
          </div>

          <div className="px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Order summary
            </h2>
            <ul className="space-y-3">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-medium text-gray-900">
                    {order.currency} {(item.price * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-gray-900">
              {order.currency} {order.total.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Browse more products
          </Link>
        </div>
      </main>
    </div>
  );
}
