'use client';

import Link from 'next/link';

export default function ShopFooter() {
  return (
    <footer className="bg-shop-card border-t border-shop-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold text-shop-fg mb-3">hhourssop</h3>
            <p className="text-sm text-shop-muted">
              Your trusted shop for quality products.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-shop-fg mb-3">Quick links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-shop-muted hover:text-shop-fg transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-shop-muted hover:text-shop-fg transition-colors">
                  About us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-shop-muted hover:text-shop-fg transition-colors">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-sm text-shop-muted hover:text-shop-fg transition-colors">
                  Explore categories
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-sm text-shop-muted hover:text-shop-fg transition-colors">
                  Cart
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-shop-fg mb-3">Contact</h3>
            <p className="text-sm text-shop-muted mb-2">
              Questions? We&apos;re here to help.
            </p>
            <Link href="/contact" className="text-sm text-shop-accent hover:underline">
              Send us a message
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-shop-border text-center text-sm text-shop-muted">
          © {new Date().getFullYear()} hhourssop. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
