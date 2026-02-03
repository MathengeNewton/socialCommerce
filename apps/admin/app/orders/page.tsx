'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import DataTable, { DataTableColumn } from '../components/DataTable';

type Order = {
  id: string;
  publicId: string;
  customerName: string;
  customerEmail: string;
  status: string;
  total: number | string;
  currency: string;
  createdAt: string;
  items?: Array<{ quantity: number; product?: { title: string } }>;
};

export default function OrdersPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchOrders = async () => {
    setError('');
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const res = await fetch(`${apiUrl}/orders`, { headers });
    if (res.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
      return;
    }
    if (!res.ok) {
      setError('Failed to load orders');
      return;
    }
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchOrders();
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const num = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : 0);

  const orderRows = useMemo(
    () =>
      orders.map((o) => ({
        ...o,
        _totalStr: `${o.currency} ${num(o.total).toFixed(2)}`,
        _createdAt: new Date(o.createdAt).toLocaleString(),
      })),
    [orders]
  );

  const columns: DataTableColumn<Order & { _totalStr: string; _createdAt: string }>[] = [
    { key: 'publicId', label: 'Order ID', sortable: true, exportValue: (r) => r.publicId, render: (r) => <span className="font-mono font-medium">{r.publicId}</span> },
    { key: 'customerName', label: 'Customer', sortable: true, exportValue: (r) => r.customerName, render: (r) => r.customerName },
    { key: 'customerEmail', label: 'Email', sortable: true, exportValue: (r) => r.customerEmail, render: (r) => r.customerEmail },
    { key: '_totalStr', label: 'Total', sortable: true, exportValue: (r) => r._totalStr, render: (r) => r._totalStr },
    { key: 'status', label: 'Status', sortable: true, exportValue: (r) => r.status, render: (r) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'complete' ? 'bg-green-100 text-green-800' : r.status === 'cancelled' ? 'bg-red-100 text-red-800' : r.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{r.status}</span> },
    { key: '_createdAt', label: 'Created', sortable: true, exportValue: (r) => r._createdAt, render: (r) => r._createdAt },
    { key: 'actions', label: 'Actions', sortable: false, render: (r) => <Link href={`/orders/${r.publicId}`} className="text-blue-600 hover:underline text-sm font-medium">View</Link> },
  ];

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, contacted: 0, quoted: 0, complete: 0, cancelled: 0 };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    });
    return counts;
  }, [orders]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <AdminNav title="hhourssop · Orders" backHref="/dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-2xl font-bold text-amber-600">{statusCounts.pending ?? 0}</div>
            <div className="text-sm text-slate-600">New</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.contacted ?? 0}</div>
            <div className="text-sm text-slate-600">Contacted</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{statusCounts.quoted ?? 0}</div>
            <div className="text-sm text-slate-600">Quoted</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{statusCounts.complete ?? 0}</div>
            <div className="text-sm text-slate-600">Done</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-2xl font-bold text-red-600">{statusCounts.cancelled ?? 0}</div>
            <div className="text-sm text-slate-600">Cancelled</div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={orderRows}
            getRowId={(r) => r.id}
            emptyMessage="No orders yet. Orders will appear when customers purchase from your store."
            title="Orders"
          />
        )}
      </main>
    </div>
  );
}
