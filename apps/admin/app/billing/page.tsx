'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '../components/AdminNav';
import { useToast } from '../components/ToastContext';
import { useConfirm } from '../components/ConfirmContext';

type Tariff = {
  id: string;
  name: string;
  currency: string;
  minPostsPerWeek?: number;
  rulesJson?: Record<string, unknown>;
  createdAt?: string;
};

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

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [tab, setTab] = useState<'invoices' | 'tariffs'>(() =>
    searchParams.get('tab') === 'tariffs' ? 'tariffs' : 'invoices'
  );
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [tariffError, setTariffError] = useState('');
  const [showCreateTariff, setShowCreateTariff] = useState(false);
  const [showAssignTariff, setShowAssignTariff] = useState(false);
  const [assignClientId, setAssignClientId] = useState('');
  const [assignTariffId, setAssignTariffId] = useState('');
  const [newTariffName, setNewTariffName] = useState('');
  const [newTariffCurrency, setNewTariffCurrency] = useState('KES');
  const [newTariffMinPosts, setNewTariffMinPosts] = useState(0);
  const [tariffSaving, setTariffSaving] = useState(false);
  const { toast } = useToast();
  const { confirm } = useConfirm();

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
    setTab(searchParams.get('tab') === 'tariffs' ? 'tariffs' : 'invoices');
  }, [searchParams]);

  const fetchTariffs = async () => {
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${apiUrl}/tariffs`, { headers });
    if (res.ok) {
      const data = await res.json();
      setTariffs(Array.isArray(data) ? data : []);
    }
  };

  useEffect(() => {
    if (tab !== 'tariffs') return;
    const headers = authHeaders();
    if (!headers) return;
    setTariffError('');
    fetch(`${apiUrl}/tariffs`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTariffs(Array.isArray(d) ? d : []))
      .catch(() => setTariffError('Failed to load tariffs'));
  }, [tab, apiUrl]);

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
      toast('Please select a client and date range', 'error');
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
        toast(error.message || 'Failed to generate invoice', 'error');
        return;
      }

      const invoice = await res.json();
      toast('Invoice generated successfully!', 'success');
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
      toast('Failed to generate invoice', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    const ok = await confirm({ message: 'Mark this invoice as paid?', title: 'Confirm' });
    if (!ok) return;

    const headers = authHeaders();
    if (!headers) return;

    try {
      const res = await fetch(`${apiUrl}/billing/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        toast('Failed to mark invoice as paid', 'error');
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
      toast('Failed to mark invoice as paid', 'error');
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

  const createTariff = async () => {
    setTariffError('');
    const headers = authHeaders();
    if (!headers || !newTariffName.trim()) return;
    setTariffSaving(true);
    try {
      const res = await fetch(`${apiUrl}/tariffs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTariffName.trim(), currency: newTariffCurrency, minPostsPerWeek: newTariffMinPosts }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed');
      setShowCreateTariff(false);
      setNewTariffName('');
      await fetchTariffs();
    } catch (e) {
      setTariffError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTariffSaving(false);
    }
  };

  const assignTariff = async () => {
    setTariffError('');
    const headers = authHeaders();
    if (!headers || !assignClientId || !assignTariffId) return;
    setTariffSaving(true);
    try {
      const res = await fetch(`${apiUrl}/clients/${assignClientId}/tariff`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tariffId: assignTariffId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed');
      setShowAssignTariff(false);
      setAssignClientId('');
      setAssignTariffId('');
    } catch (e) {
      setTariffError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTariffSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <AdminNav title="hhourssop · Billing" backHref="/dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setTab('invoices')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'invoices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Invoices
          </button>
          <button
            onClick={() => setTab('tariffs')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'tariffs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Tariffs
          </button>
        </div>

        {tab === 'tariffs' ? (
          <>
            <div className="flex justify-end gap-2 mb-4">
              <button onClick={() => { setShowAssignTariff(true); setAssignClientId(clients[0]?.id ?? ''); setAssignTariffId(tariffs[0]?.id ?? ''); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                Assign to client
              </button>
              <button onClick={() => setShowCreateTariff(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Create tariff
              </button>
            </div>
            {tariffError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{tariffError}</div>}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {tariffs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No tariffs yet</p>
                  <button onClick={() => setShowCreateTariff(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                    Create tariff
                  </button>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Currency</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Min posts/week</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tariffs.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{t.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{t.currency}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{t.minPostsPerWeek ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {showCreateTariff && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-md w-full p-6">
                  <h2 className="text-lg font-bold mb-4">Create tariff</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input type="text" value={newTariffName} onChange={(e) => setNewTariffName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. Starter" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                      <select value={newTariffCurrency} onChange={(e) => setNewTariffCurrency(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="KES">KES</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min posts per week</label>
                      <input type="number" min={0} value={newTariffMinPosts} onChange={(e) => setNewTariffMinPosts(parseInt(e.target.value, 10) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setShowCreateTariff(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                    <button onClick={createTariff} disabled={tariffSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{tariffSaving ? 'Creating…' : 'Create'}</button>
                  </div>
                </div>
              </div>
            )}
            {showAssignTariff && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-md w-full p-6">
                  <h2 className="text-lg font-bold mb-4">Assign tariff to client</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                      <select value={assignClientId} onChange={(e) => setAssignClientId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tariff</label>
                      <select value={assignTariffId} onChange={(e) => setAssignTariffId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        {tariffs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setShowAssignTariff(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                    <button onClick={assignTariff} disabled={tariffSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{tariffSaving ? 'Assigning…' : 'Assign'}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" /></div>}>
      <BillingContent />
    </Suspense>
  );
}
