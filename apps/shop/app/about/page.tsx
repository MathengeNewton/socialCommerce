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
            hhourssop is Kenya&apos;s largest product marketplace, connecting buyers with trusted sellers
            across a wide range of categories. We believe in making shopping simple, transparent, and
            accessible for everyone.
          </p>

          <p className="leading-relaxed">
            Founded with a mission to transform how Kenyans discover and purchase products online,
            we curate a diverse selection of quality items—from electronics and home appliances to
            fashion, beauty, and everyday essentials. Every product on our platform is vetted to
            ensure you get genuine value.
          </p>

          <p className="leading-relaxed">
            Our team is passionate about customer experience. We work closely with suppliers and
            partners to bring you competitive prices, reliable delivery, and responsive support.
            Whether you&apos;re shopping for yourself or your business, we&apos;re here to help.
          </p>

          <p className="leading-relaxed">
            Thank you for choosing hhourssop. We&apos;re excited to serve you and look forward to
            growing together.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-shop-border">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-shop-accent text-shop-bg font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Get in touch
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}
