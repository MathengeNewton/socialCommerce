/**
 * Demo mode: intercepts fetch and returns mock data.
 * Enable via ?demo=1 or sessionStorage.demoMode='1'
 */

import {
  demoUser,
  demoClients,
  demoClientDetail,
  demoIntegrations,
  demoPosts,
  demoProducts,
  demoDashboardStats,
  demoActivity,
  demoDestinations,
  demoCategories,
  demoTariffs,
} from './mockData';

const DEMO_CLIENT_ID = 'demo-client-001';

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    sessionStorage.getItem('demoMode') === '1' ||
    (typeof window !== 'undefined' && window.location.search.includes('demo=1'))
  );
}

export function enableDemoMode(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('demoMode', '1');
  localStorage.setItem('accessToken', 'demo-access-token');
  localStorage.setItem('refreshToken', 'demo-refresh-token');
}

export function disableDemoMode(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('demoMode');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getMockForUrl(url: string, method: string): Response | null {
  const u = url.toLowerCase();
  const isGet = method === 'GET';
  const isPost = method === 'POST';

  // Auth
  if (u.includes('/auth/login') && isPost) {
    return jsonResponse({
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
      user: demoUser,
    });
  }
  if (u.includes('/auth/me') && isGet) {
    return jsonResponse(demoUser);
  }

  // Dashboard
  if (u.includes('/dashboard/stats') && isGet) {
    return jsonResponse(demoDashboardStats);
  }
  if (u.includes('/dashboard/activity') && isGet) {
    return jsonResponse(demoActivity);
  }

  // Clients
  if (u.includes('/clients') && isGet) {
    if (u.includes('/detail') || (u.includes('/clients/') && !u.includes('?'))) {
      const idMatch = url.match(/\/clients\/([^/?]+)/);
      const id = idMatch?.[1];
      if (id === DEMO_CLIENT_ID || id === 'demo-client-001') {
        return jsonResponse(demoClientDetail);
      }
    }
    return jsonResponse(demoClients);
  }
  if (u.includes('/clients/') && (method === 'PUT' || method === 'DELETE' || method === 'POST')) {
    return jsonResponse({ success: true });
  }
  if (u.includes('/social/summary') && isGet) {
    return jsonResponse({ clientId: DEMO_CLIENT_ID, hasAnyDestination: true });
  }

  // Integrations
  if (u.includes('/integrations') && isGet) {
    const clientMatch = url.match(/clientId=([^&]+)/);
    const clientId = clientMatch?.[1];
    if (!clientId || clientId === DEMO_CLIENT_ID) {
      return jsonResponse(demoIntegrations);
    }
    return jsonResponse([]);
  }
  if (u.includes('/integrations') && (isPost || method === 'DELETE')) {
    return jsonResponse({ success: true });
  }

  // Destinations
  if (u.includes('/destinations') && isGet) {
    const clientMatch = url.match(/clientId=([^&]+)/);
    const clientId = clientMatch?.[1];
    if (!clientId || clientId === DEMO_CLIENT_ID) {
      return jsonResponse(demoDestinations);
    }
    return jsonResponse([]);
  }

  // Posts
  if (u.includes('/posts') && isGet) {
    return jsonResponse(demoPosts);
  }
  if (u.includes('/posts/') && isGet && !u.includes('/publish') && !u.includes('/schedule')) {
    const idMatch = url.match(/\/posts\/([^/?]+)/);
    const id = idMatch?.[1];
    const post = demoPosts.find((p) => p.id === id);
    return post ? jsonResponse(post) : jsonResponse({ message: 'Not found' }, 404);
  }
  if ((u.includes('/posts') && isPost) || (u.includes('/posts/') && (u.includes('/publish') || u.includes('/schedule')))) {
    return jsonResponse({ id: 'demo-post-new', status: 'draft' });
  }

  // Products
  if (u.includes('/products') && isGet) {
    if (u.match(/\/products\/[^/?]+/) && !u.includes('?')) {
      const idMatch = url.match(/\/products\/([^/?]+)/);
      const slugOrId = idMatch?.[1];
      const product = demoProducts.find((p) => p.id === slugOrId || p.slug === slugOrId);
      return product ? jsonResponse(product) : jsonResponse({ message: 'Not found' }, 404);
    }
    return jsonResponse(demoProducts);
  }
  if (u.includes('/products/') && isGet) {
    const idMatch = url.match(/\/products\/([^/?]+)/);
    const id = idMatch?.[1];
    const product = demoProducts.find((p) => p.id === id);
    return product ? jsonResponse(product) : jsonResponse({ message: 'Not found' }, 404);
  }

  // Categories
  if (u.includes('/categories') && isGet) {
    return jsonResponse(demoCategories);
  }

  // Tariffs / Billing
  if (u.includes('/tariffs') && isGet) {
    return jsonResponse(demoTariffs);
  }
  if (u.includes('/billing/') || u.includes('/invoices')) {
    return jsonResponse([]);
  }

  // Suppliers
  if (u.includes('/suppliers') && isGet) {
    return jsonResponse([]);
  }

  // Users (staff)
  if (u.includes('/users') && isGet) {
    return jsonResponse([demoUser]);
  }

  // Orders
  if (u.includes('/orders') && isGet) {
    return jsonResponse([]);
  }

  // Media upload (compose)
  if (u.includes('/media/upload') && method === 'POST') {
    return jsonResponse({ mediaId: 'demo-media-001', url: 'https://placehold.co/400x400/1a1a2e/eee?text=Demo' });
  }

  return null;
}

let installed = false;

export function installMockFetch(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  const originalFetch = window.fetch;
  window.fetch = function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    if (!isDemoMode()) {
      return originalFetch.call(window, input, init);
    }

    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || 'GET';

    const mock = getMockForUrl(url, method);
    if (mock) {
      return Promise.resolve(mock);
    }

    return originalFetch.call(window, input, init);
  };
}

// Auto-install when module loads (must be imported early, e.g. in Providers)
if (typeof window !== 'undefined') {
  installMockFetch();
}
