import Link from 'next/link';
import ShopHeader from '../components/ShopHeader';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-shop-bg flex flex-col">
      <ShopHeader />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-shop-fg mb-8">
          About us
        </h1>

        <div className="prose prose-invert max-w-none space-y-6 text-shop-muted">
          <p className="text-lg leading-relaxed">
            hhourssop helps brands stay visible online through practical social media management,
            while also curating featured electronics and lifestyle products for customers who want a
            simpler buying experience.
          </p>

          <p className="leading-relaxed">
            Our service side is built for businesses that need consistent content, publishing support,
            and a cleaner way to communicate their value online. We package that work into clear
            monthly retainers so clients know exactly what they are getting.
          </p>

          <p className="leading-relaxed">
            On the commerce side, we keep the storefront intentionally focused. Instead of overwhelming
            visitors with clutter, we highlight featured products and make it easy to browse, view,
            and purchase without friction.
          </p>

          <p className="leading-relaxed">
            Whether you need help managing your online presence or want to shop curated products,
            hhourssop is designed to make both experiences feel straightforward and polished.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-shop-border">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-shop-accent text-shop-bg font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Contact us
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}
