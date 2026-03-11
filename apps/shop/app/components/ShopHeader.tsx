'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { useCart } from '../context/CartContext';

type ShopHeaderProps = {
  categories?: { id: string; name: string; slug: string }[];
  currentCategory?: string;
};

export default function ShopHeader({ categories = [], currentCategory }: ShopHeaderProps) {
  const { itemCount } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const searchPlaceholder =
    categories.length > 0 && currentCategory ? 'Search this category...' : 'Search products...';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  const linkClass = (active: boolean) =>
    `rounded-full px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? 'bg-shop-bg text-shop-fg'
        : 'text-shop-muted hover:bg-shop-bg/80 hover:text-shop-fg'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-shop-border/80 bg-shop-card/88 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[72px] flex-wrap items-center gap-3 py-3 md:flex-nowrap md:justify-between">
          <Link href="/" className="shrink-0 transition-opacity hover:opacity-90">
            <span className="text-lg font-bold tracking-tight text-shop-fg sm:text-xl">hhourssop</span>
          </Link>

          <form onSubmit={handleSearch} className="order-3 w-full sm:order-none sm:flex sm:flex-1 sm:justify-center sm:px-6">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-full border border-shop-border bg-shop-bg/85 px-4 py-2.5 text-sm text-shop-fg placeholder-shop-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-shop-accent sm:max-w-md"
              aria-label="Search products"
            />
          </form>

          <nav className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href="/" className={`hidden md:inline-flex ${linkClass(pathname === '/')}`}>
              Home
            </Link>

            <Link href="/about" className={`hidden md:inline-flex ${linkClass(pathname === '/about')}`}>
              About Us
            </Link>

            <Link
              href="/contact"
              className={`hidden md:inline-flex ${linkClass(pathname === '/contact')}`}
            >
              Contact Us
            </Link>

            <Link
              href="/cart"
              className="relative rounded-full p-2 text-shop-fg transition-colors hover:bg-shop-bg/80"
              aria-label="View cart"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-shop-badge px-1 text-[11px] font-semibold text-shop-badge-fg ring-2 ring-shop-card">
                {itemCount}
              </span>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
