'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function FacebookOAuthContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState<'facebook' | 'instagram'>('facebook');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // clientId
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setStatus('error');
      setMessage(searchParams.get('error_description') || 'Facebook denied access.');
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setMessage('Missing code or state. Try connecting again from Integrations.');
      return;
    }

    const isInstagram = state.startsWith('instagram:');
    const clientId = isInstagram ? state.slice(10) : state;
    setProvider(isInstagram ? 'instagram' : 'facebook');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
    const redirectUri =
      typeof window !== 'undefined'
        ? `${window.location.origin}/settings/oauth/facebook`
        : '';

    (async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setStatus('error');
          setMessage('Not logged in. Please log in and try again.');
          return;
        }
        const res = await fetch(`${apiUrl}/integrations/${provider}/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            clientId,
            code,
            redirectUri,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = data.message;
          const message =
            typeof msg === 'string'
              ? msg
              : Array.isArray(msg)
                ? msg[0] || 'Failed to connect'
                : 'Failed to connect';
          throw new Error(message);
        }
        setStatus('success');
      } catch (e) {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : 'Failed to connect');
      }
    })();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
        <p className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">hhourssop</p>
        {status === 'loading' && (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600 font-medium">Connecting {provider === 'instagram' ? 'Instagram' : 'Facebook'}...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{provider === 'instagram' ? 'Instagram' : 'Facebook'} connected</h1>
            <p className="text-gray-600 mb-6">You can now publish to your {provider === 'instagram' ? 'Instagram' : 'Facebook Page(s)'}.</p>
            <Link
              href="/integrations"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Back to Integrations
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Connection failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              href="/integrations"
              className="inline-block bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 transition-all"
            >
              Back to Integrations
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function FacebookOAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" /></div>}>
      <FacebookOAuthContent />
    </Suspense>
  );
}
