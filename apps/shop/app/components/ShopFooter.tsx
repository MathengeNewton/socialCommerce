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
              Social media management packages and curated products, presented in one clean storefront.
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
                <Link href="/products" className="text-sm text-shop-muted hover:text-shop-fg transition-colors">
                  Products
                </Link>
              </li>
              <li>
                <Link href="/#packages" className="text-sm text-shop-muted hover:text-shop-fg transition-colors">
                  Packages
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
                <Link href="/terms" className="text-sm text-shop-muted hover:text-shop-fg transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-shop-muted hover:text-shop-fg transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-shop-fg mb-3">Contact</h3>
            <p className="text-sm text-shop-muted mb-2">
              Need a package, a quote, or help choosing a featured product?
            </p>
            <Link href="/contact" className="text-sm text-shop-accent hover:underline">
              Send us a message
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-shop-border text-center text-sm text-shop-muted">
          © {new Date().getFullYear()} hhourssop. All rights reserved. Built at{' '}
          <a
            href="https://mangoseasonlabs.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="inline font-medium text-shop-fg transition-opacity hover:opacity-80"
          >
            Mango Season Labs<sup className="ml-0.5 text-[10px]">tm</sup>
          </a>
        </div>
      </div>
    </footer>
  );
}
