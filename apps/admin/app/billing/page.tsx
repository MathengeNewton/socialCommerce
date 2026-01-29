'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  }>;
};

type Client = {
  id: string;
  name: string;
};

export default function BillingPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const fetchClients = async () => {
      const headers = authHeaders();
      if (!headers) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch(`${apiUrl}/clients`, { headers });
        if (res.ok) {
          const data = await res.json();
          setClients(data);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };

    fetchClients();
  }, [apiUrl, router]);

  useEffect(() => {
    if (!selectedClientId) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    const fetchInvoices = async () => {
      setLoading(true);
      const headers = authHeaders();
      if (!headers) return;

      try {
        const res = await fetch(`${apiUrl}/billing/clients/${selectedClientId}/invoices`, {
          headers,
        });
        if (res.ok) {
          const data = await res.json();
          setInvoices(data);
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [selectedClientId, apiUrl]);

  const handleGenerateInvoice = async () => {
    if (!selectedClientId || !periodStart || !periodEnd) {
      alert('Please select a client and date range');
      return;
    }

    setGenerating(true);
    const headers = authHeaders();
    if (!headers) return;

    try {
      const res = await fetch(
        `${apiUrl}/billing/clients/${selectedClientId}/invoices/generate?periodStart=${encodeURIComponent(periodStart)}&periodEnd=${encodeURIComponent(periodEnd)}`,
        {
          method: 'POST',
          headers,
        },
      );

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to generate invoice' }));
        alert(error.message || 'Failed to generate invoice');
        return;
      }

      const invoice = await res.json();
      alert('Invoice generated successfully!');
      setPeriodStart('');
      setPeriodEnd('');
      // Refresh invoices
      const invoicesRes = await fetch(`${apiUrl}/billing/clients/${selectedClientId}/invoices`, {
        headers,
      });
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    if (!confirm('Mark this invoice as paid?')) return;

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

      // Refresh invoices
      if (selectedClientId) {
        const invoicesRes = await fetch(`${apiUrl}/billing/clients/${selectedClientId}/invoices`, {
          headers,
        });
        if (invoicesRes.ok) {
          const data = await invoicesRes.json();
          setInvoices(data);
        }
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      alert('Failed to mark invoice as paid');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                hhourssop · Billing & Invoices
              </h1>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Selection */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Select Client</h2>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">-- Select a client --</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {/* Generate Invoice */}
        {selectedClientId && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Invoice</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Period Start</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Period End</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleGenerateInvoice}
                  disabled={generating || !periodStart || !periodEnd}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {generating ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoices List */}
        {selectedClientId && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 font-medium">Loading invoices...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-3xl mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No invoices found</h3>
                <p className="text-gray-600">Generate an invoice for this client to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Link
                            href={`/billing/${invoice.id}`}
                            className="font-bold text-lg text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            Invoice #{invoice.id.slice(0, 8)}
                          </Link>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : invoice.status === 'issued'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {invoice.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Period: {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Issued: {formatDate(invoice.issuedAt)} | Paid: {formatDate(invoice.paidAt)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {invoice.lines.length} line item(s)
                        </p>
                      </div>
                      <div className="text-right ml-6">
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          {formatCurrency(Number(invoice.total))}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Link
                            href={`/billing/${invoice.id}`}
                            className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm"
                          >
                            View
                          </Link>
                          {invoice.status === 'issued' && (
                            <button
                              onClick={() => handleMarkPaid(invoice.id)}
                              className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors font-medium text-sm"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
