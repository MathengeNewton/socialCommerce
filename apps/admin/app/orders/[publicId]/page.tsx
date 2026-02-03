'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '../../components/AdminNav';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const publicId = params.publicId as string;
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fulfillmentNotes, setFulfillmentNotes] = useState('');
  const [finalTotal, setFinalTotal] = useState('');
  const [updating, setUpdating] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchOrder = async () => {
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const res = await fetch(`${apiUrl}/orders/${publicId}`, { headers });
    if (res.status === 401) {
      router.push('/login');
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setOrder(data);
      setFulfillmentNotes(data.fulfillmentNotes ?? '');
      setFinalTotal(data.finalTotal != null ? String(data.finalTotal) : '');
    } else {
      setOrder(null);
    }
  };

  useEffect(() => {
    fetchOrder().finally(() => setLoading(false));
  }, [publicId, apiUrl]);

  const updateFulfillment = async (updates: { isGenuine?: boolean; status?: string; finalTotal?: number; fulfillmentNotes?: string }) => {
    if (!order?.publicId || !authHeaders()) return;
    setUpdating(true);
    try {
      const body: any = { ...updates };
      if (updates.finalTotal !== undefined) body.finalTotal = updates.finalTotal;
      const res = await fetch(`${apiUrl}/orders/${order.publicId}/fulfillment`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) await fetchOrder();
    } finally {
      setUpdating(false);
    }
  };

  const handleSetFinalTotal = () => {
    const n = parseFloat(finalTotal);
    if (!isNaN(n) && n >= 0) updateFulfillment({ finalTotal: n });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-600 border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminNav title="Order not found" backHref="/orders" />
        <main className="max-w-2xl mx-auto px-4 py-8 text-center">
          <p className="text-slate-600 mb-4">Order {publicId} not found.</p>
          <Link href="/orders" className="text-blue-600 hover:underline">Back to orders</Link>
        </main>
      </div>
    );
  }

  const isPending = ['pending', 'contacted', 'quoted'].includes(order.status);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav title={`Order ${order.publicId}`} backHref="/orders" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{order.publicId}</h1>
              <p className="text-sm text-slate-500 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              order.status === 'complete' ? 'bg-green-100 text-green-800' :
              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-amber-100 text-amber-800'
            }`}>
              {order.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 font-medium">Customer</p>
              <p className="text-slate-900">{order.customerName}</p>
              <p className="text-slate-600">{order.customerEmail}</p>
              {order.customerPhone && <p className="text-slate-600">{order.customerPhone}</p>}
            </div>
          </div>

          <div>
            <p className="text-slate-500 font-medium text-sm mb-1">Delivery</p>
            <p className="text-slate-900 capitalize">{order.deliveryType ?? 'pickup'}</p>
            {order.customerAddress && <p className="text-slate-600 text-sm mt-1">{order.customerAddress}</p>}
            {order.customerPreference && <p className="text-slate-600 text-sm mt-1 italic">Note: {order.customerPreference}</p>}
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">Items</h2>
            <ul className="space-y-2">
              {order.items?.map((item: any, i: number) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-slate-700">{item.product?.title ?? 'Product'} × {item.quantity}</span>
                  <span className="text-slate-900">{order.currency} {Number(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t flex justify-between font-semibold">
            <span>Total (list price)</span>
            <span>{order.currency} {Number(order.total).toFixed(2)}</span>
          </div>
          {order.finalTotal != null && (
            <div className="flex justify-between font-semibold text-green-700">
              <span>Selling price</span>
              <span>{order.currency} {Number(order.finalTotal).toFixed(2)}</span>
            </div>
          )}

          {/* Fulfillment actions */}
          {isPending && (
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <h3 className="font-semibold text-slate-900">Order fulfillment</h3>

              <div>
                <p className="text-sm text-slate-600 mb-2">Mark order</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateFulfillment({ isGenuine: true })}
                    disabled={updating}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${order.isGenuine === true ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    Genuine
                  </button>
                  <button
                    onClick={() => updateFulfillment({ isGenuine: false })}
                    disabled={updating}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${order.isGenuine === false ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    Not genuine
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {['contacted', 'quoted', 'complete'].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateFulfillment({ status: s })}
                      disabled={updating}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${order.status === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-2">Selling price (KES)</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={finalTotal}
                    onChange={(e) => setFinalTotal(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg w-32"
                  />
                  <button
                    onClick={handleSetFinalTotal}
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Set price
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-2">Notes</p>
                <textarea
                  value={fulfillmentNotes}
                  onChange={(e) => setFulfillmentNotes(e.target.value)}
                  onBlur={() => {
                    if (fulfillmentNotes !== (order.fulfillmentNotes ?? '')) {
                      updateFulfillment({ fulfillmentNotes });
                    }
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Contact notes, customer response..."
                />
              </div>
            </div>
          )}
        </div>

        <Link href="/orders" className="inline-block mt-6 text-blue-600 hover:underline text-sm font-medium">
          ← Back to orders
        </Link>
      </main>
    </div>
  );
}
