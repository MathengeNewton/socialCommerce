'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '../components/AdminNav';

type Stats = {
  products: number;
  orders: number;
  posts: number;
  integrations: number;
  clients: number;
  messagesUnread?: number;
  overview: {
    publishedProducts: number;
    draftProducts: number;
    featuredProducts: number;
    lowStockVariants: number;
    pendingOrders: number;
    quotedOrders: number;
    completedOrders: number;
    ordersNeedingReview: number;
    scheduledPosts: number;
    publishedPosts: number;
    failedPosts: number;
    activeClients: number;
    staff: number;
    suppliers: number;
    categories: number;
    activePackages: number;
    heroImageConfigured: boolean;
    messagesLast7Days: number;
  };
  revenue: {
    grossOrderValue: number;
    finalizedOrderValue: number;
    collectedRevenue: number;
    averageOrderValue: number;
  };
};
type ActivityItem = { type: 'post' | 'client' | 'order' | 'message'; id: string; label: string; createdAt: string };

export default function DashboardPage() {
  const router = useRouter();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004', []);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    products: 0,
    orders: 0,
    posts: 0,
    integrations: 0,
    clients: 0,
    messagesUnread: 0,
    overview: {
      publishedProducts: 0,
      draftProducts: 0,
      featuredProducts: 0,
      lowStockVariants: 0,
      pendingOrders: 0,
      quotedOrders: 0,
      completedOrders: 0,
      ordersNeedingReview: 0,
      scheduledPosts: 0,
      publishedPosts: 0,
      failedPosts: 0,
      activeClients: 0,
      staff: 0,
      suppliers: 0,
      categories: 0,
      activePackages: 0,
      heroImageConfigured: false,
      messagesLast7Days: 0,
    },
    revenue: {
      grossOrderValue: 0,
      finalizedOrderValue: 0,
      collectedRevenue: 0,
      averageOrderValue: 0,
    },
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    const load = async () => {
      try {
        const meRes = await fetch(`${apiUrl}/auth/me`, { headers });
        if (!meRes.ok) throw new Error('Unauthorized');
        const userData = await meRes.json();
        setUser(userData);

        const [statsRes, activityRes] = await Promise.all([
          fetch(`${apiUrl}/dashboard/stats`, { headers }),
          fetch(`${apiUrl}/dashboard/activity`, { headers }),
        ]);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          setActivity(Array.isArray(activityData) ? activityData : []);
        }
      } catch (error) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, apiUrl]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-600 rounded-full mb-4" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  const currency = (value: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value || 0);

  const statCards = [
    { label: 'Revenue', value: currency(stats.revenue.grossOrderValue), hint: `Avg order ${currency(stats.revenue.averageOrderValue)}` },
    { label: 'Orders To Action', value: String(stats.overview.pendingOrders + stats.overview.quotedOrders), hint: `${stats.overview.ordersNeedingReview} need review` },
    { label: 'Unread Messages', value: String(stats.messagesUnread ?? 0), hint: `${stats.overview.messagesLast7Days} in 7 days` },
    { label: 'Active Clients', value: String(stats.overview.activeClients), hint: `${stats.overview.staff} staff accounts` },
  ];

  function formatTimeAgo(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (sec < 60) return 'Just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
    return d.toLocaleDateString();
  }

  const quickActions = [
    { title: 'Shop', href: process.env.NEXT_PUBLIC_SHOP_URL || 'http://localhost:3003', icon: '🛍️', external: true },
    { title: 'Catalog', href: '/catalog', icon: '📦' },
    ...(isAdmin ? [{ title: 'Packages', href: '/packages', icon: '💼' }] : []),
    { title: 'Orders', href: '/orders', icon: '🛒' },
    { title: 'Messages', href: '/messages', icon: '✉️', badge: stats.messagesUnread ?? 0 },
    { title: 'Posts', href: '/posts', icon: '📝' },
    { title: 'Calendar', href: '/posts/calendar', icon: '📅' },
    ...(isAdmin ? [{ title: 'Clients', href: '/clients', icon: '👥' }] : []),
    ...(isAdmin ? [{ title: 'Suppliers', href: '/suppliers', icon: '🏢' }] : []),
    ...(isAdmin ? [{ title: 'Billing', href: '/billing', icon: '💰' }] : []),
    ...(isAdmin ? [{ title: 'Integrations', href: '/integrations', icon: '🔗' }] : []),
    ...(isAdmin ? [{ title: 'Staff', href: '/staff', icon: '👤' }] : []),
    ...(!isAdmin ? [{ title: 'Compose', href: '/compose', icon: '✏️' }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav title="hhourssop" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            {user?.name || user?.email?.split('@')[0] || 'Admin'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Overview of your store</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200/80 px-5 py-4 shadow-sm">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">{stat.value}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-10">
          <section className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Orders</h2>
                <p className="text-sm text-slate-500 mt-1">What needs attention now.</p>
              </div>
              <Link href="/orders" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View
              </Link>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>Pending</span><span className="font-medium text-slate-900">{stats.overview.pendingOrders}</span></div>
              <div className="flex items-center justify-between"><span>Quoted</span><span className="font-medium text-slate-900">{stats.overview.quotedOrders}</span></div>
              <div className="flex items-center justify-between"><span>Completed</span><span className="font-medium text-slate-900">{stats.overview.completedOrders}</span></div>
              <div className="flex items-center justify-between"><span>Need review</span><span className="font-medium text-slate-900">{stats.overview.ordersNeedingReview}</span></div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Collected revenue</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{currency(stats.revenue.collectedRevenue)}</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Content</h2>
              <p className="text-sm text-slate-500 mt-1">Publishing and catalog health.</p>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>Published posts</span><span className="font-medium text-slate-900">{stats.overview.publishedPosts}</span></div>
              <div className="flex items-center justify-between"><span>Scheduled posts</span><span className="font-medium text-slate-900">{stats.overview.scheduledPosts}</span></div>
              <div className="flex items-center justify-between"><span>Failed posts</span><span className="font-medium text-slate-900">{stats.overview.failedPosts}</span></div>
              <div className="flex items-center justify-between"><span>Draft products</span><span className="font-medium text-slate-900">{stats.overview.draftProducts}</span></div>
              <div className="flex items-center justify-between"><span>Low-stock variants</span><span className="font-medium text-slate-900">{stats.overview.lowStockVariants}</span></div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Setup</h2>
              <p className="text-sm text-slate-500 mt-1">Team, storefront, and structure.</p>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>Staff accounts</span><span className="font-medium text-slate-900">{stats.overview.staff}</span></div>
              <div className="flex items-center justify-between"><span>Suppliers</span><span className="font-medium text-slate-900">{stats.overview.suppliers}</span></div>
              <div className="flex items-center justify-between"><span>Categories</span><span className="font-medium text-slate-900">{stats.overview.categories}</span></div>
              <div className="flex items-center justify-between"><span>Active packages</span><span className="font-medium text-slate-900">{stats.overview.activePackages}</span></div>
              <div className="flex items-center justify-between"><span>Hero image</span><span className="font-medium text-slate-900">{stats.overview.heroImageConfigured ? 'Ready' : 'Missing'}</span></div>
            </div>
          </section>
        </div>

        {/* Modules */}
        <div className="mb-10">
          <h2 className="text-sm font-medium text-slate-500 mb-3">Modules</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                target={action.external ? '_blank' : undefined}
                rel={action.external ? 'noopener noreferrer' : undefined}
                className="relative flex items-center gap-3 bg-white rounded-xl border border-slate-200/80 px-4 py-3.5 shadow-sm hover:border-slate-300 hover:shadow transition-all"
              >
                <span className="text-lg">{action.icon}</span>
                <span className="text-sm font-medium text-slate-700">{action.title}</span>
                {'badge' in action && (action.badge as number) > 0 && (
                  <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1.5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                    {(action.badge as number) > 99 ? '99+' : action.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">No recent activity</p>
              <p className="text-xs mt-1 text-slate-400">Posts, clients, and orders will appear here</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((item) => (
                <li key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-3 first:pt-0">
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
                    item.type === 'post' ? 'bg-violet-100 text-violet-700' :
                    item.type === 'client' ? 'bg-slate-100 text-slate-700' :
                    item.type === 'message' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {item.type === 'post' ? 'P' : item.type === 'client' ? 'C' : item.type === 'message' ? 'M' : 'O'}
                  </span>
                  <span className="flex-1 text-sm text-slate-700 truncate">{item.label}</span>
                  <span className="text-xs text-slate-400 shrink-0">{formatTimeAgo(item.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
