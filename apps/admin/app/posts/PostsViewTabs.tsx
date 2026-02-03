'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/posts', label: 'List' },
  { href: '/posts/calendar', label: 'Calendar' },
  { href: '/posts/analysis', label: 'Analysis' },
];

export default function PostsViewTabs() {
  const pathname = usePathname();

  return (
    <div className="inline-flex p-1 rounded-lg bg-slate-100/80 border border-slate-200/60">
      {tabs.map((tab) => {
        const isActive =
          tab.href === '/posts'
            ? pathname === '/posts'
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              isActive
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
