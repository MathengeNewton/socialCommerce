import Link from 'next/link';
import ShopHeader from '../components/ShopHeader';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-shop-bg flex flex-col">
      <ShopHeader />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-shop-fg mb-8">
          Terms of Service
        </h1>

        <p className="text-shop-muted mb-10">
          Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <div className="prose prose-invert max-w-none space-y-8 text-shop-muted">
          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">1. Acceptance of terms</h2>
            <p className="leading-relaxed">
              By accessing or using hhourssop (&quot;the Platform&quot;), you agree to be bound by these Terms of Service.
              If you do not agree with any part of these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">2. Use of the platform</h2>
            <p className="leading-relaxed mb-3">
              You may use hhourssop to browse products, place orders, and access related services. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete information when creating an account or placing orders</li>
              <li>Use the platform only for lawful purposes</li>
              <li>Not attempt to interfere with the platform&apos;s operation or security</li>
              <li>Not use the platform to distribute spam, malware, or harmful content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">3. Orders and payment</h2>
            <p className="leading-relaxed">
              When you place an order, you are making an offer to purchase. We reserve the right to accept or decline
              orders at our discretion. Prices are displayed in Kenyan Shillings (KES) and are subject to change.
              Payment must be completed as specified at checkout. We do not store full payment card details on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">4. Delivery and returns</h2>
            <p className="leading-relaxed">
              Delivery times and methods depend on your location and the product. We aim to fulfil orders promptly
              but cannot guarantee specific delivery dates. Returns and refunds are handled in accordance with our
              returns policy. Please contact us for any delivery or return enquiries.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">5. Product information</h2>
            <p className="leading-relaxed">
              We strive to display accurate product descriptions, images, and pricing. However, we do not warrant
              that product information is error-free. If you receive a product that differs materially from its
              description, please contact us to arrange a return or replacement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">6. Intellectual property</h2>
            <p className="leading-relaxed">
              All content on the platform—including text, graphics, logos, and images—is the property of hhourssop
              or its licensors and is protected by applicable intellectual property laws. You may not reproduce,
              distribute, or create derivative works without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">7. Limitation of liability</h2>
            <p className="leading-relaxed">
              To the fullest extent permitted by law, hhourssop shall not be liable for any indirect, incidental,
              special, or consequential damages arising from your use of the platform. Our total liability for any
              claim shall not exceed the amount you paid for the relevant order.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">8. Privacy</h2>
            <p className="leading-relaxed">
              Your use of the platform is also governed by our Privacy Policy. By using hhourssop, you consent to
              the collection and use of your information as described therein.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">9. Changes to terms</h2>
            <p className="leading-relaxed">
              We may update these Terms of Service from time to time. Changes will be posted on this page with
              an updated &quot;Last updated&quot; date. Continued use of the platform after changes constitutes acceptance
              of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">10. Contact</h2>
            <p className="leading-relaxed">
              For questions about these Terms of Service, please contact us through our contact page.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-shop-border flex flex-wrap gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-shop-accent text-shop-bg font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Contact us
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 px-6 py-3 border border-shop-border text-shop-fg font-semibold rounded-lg hover:bg-shop-card transition-colors"
          >
            About us
          </Link>
        </div>
      </main>
    </div>
  );
}
