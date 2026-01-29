'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Invoice = {
  id: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  issuedAt: string | null;
  paidAt: string | null;
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    metadataJson?: any;
  }>;
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const fetchInvoice = async () => {
      const headers = authHeaders();
      if (!headers) {
        router.push('/login');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/billing/invoices/${invoiceId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setInvoice(data);
        } else if (res.status === 404) {
          alert('Invoice not found');
          router.push('/billing');
        }
      } catch (error) {
        console.error('Error fetching invoice:', error);
        alert('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId, apiUrl, router]);

  const handleMarkPaid = async () => {
    if (!confirm('Mark this invoice as paid?')) return;

    setMarkingPaid(true);
    const headers = authHeaders();
    if (!headers) return;

    try {
      const res = await fetch(`${apiUrl}/billing/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        alert('Failed to mark invoice as paid');
        return;
      }

      const updatedInvoice = await res.json();
      setInvoice(updatedInvoice);
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      alert('Failed to mark invoice as paid');
    } finally {
      setMarkingPaid(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invoice not found</h1>
          <Link href="/billing" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to Billing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/billing" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                hhourssop · Invoice Details
              </h1>
            </Link>
            {invoice.status === 'issued' && (
              <button
                onClick={handleMarkPaid}
                disabled={markingPaid}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {markingPaid ? 'Marking...' : 'Mark as Paid'}
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Invoice Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Invoice</h2>
                <p className="text-blue-100">#{invoice.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    invoice.status === 'paid'
                      ? 'bg-green-500 text-white'
                      : invoice.status === 'issued'
                        ? 'bg-white text-blue-600'
                        : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {invoice.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="p-8">
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Billing Period</h3>
                <p className="text-gray-900 font-medium">
                  {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Dates</h3>
                <p className="text-gray-900">
                  <span className="block">Issued: {formatDate(invoice.issuedAt)}</span>
                  {invoice.paidAt && <span className="block">Paid: {formatDate(invoice.paidAt)}</span>}
                </p>
              </div>
            </div>

            {/* Invoice Lines */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Line Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Description</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Quantity</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Unit Price</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line) => (
                      <tr key={line.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-gray-900">{line.description}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{line.quantity}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(Number(line.unitPrice))}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {formatCurrency(Number(line.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Totals */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(Number(invoice.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax:</span>
                    <span>{formatCurrency(Number(invoice.tax))}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                    <span>Total:</span>
                    <span className="text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {formatCurrency(Number(invoice.total))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
