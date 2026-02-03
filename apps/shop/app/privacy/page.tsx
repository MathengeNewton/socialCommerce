import Link from 'next/link';
import ShopHeader from '../components/ShopHeader';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-shop-bg flex flex-col">
      <ShopHeader />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-shop-fg mb-8">
          Privacy Policy
        </h1>

        <p className="text-shop-muted mb-10">
          Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <div className="prose prose-invert max-w-none space-y-8 text-shop-muted">
          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">1. Introduction</h2>
            <p className="leading-relaxed">
              hhourssop (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our website and
              services. Please read this policy carefully.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">2. Information we collect</h2>
            <p className="leading-relaxed mb-3">
              We may collect the following types of information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-shop-fg">Personal information:</strong> Name, email address, phone number, and delivery address when you place an order or contact us</li>
              <li><strong className="text-shop-fg">Order information:</strong> Products purchased, payment details (processed securely by our payment providers), and order history</li>
              <li><strong className="text-shop-fg">Usage data:</strong> How you interact with our website, including pages visited and actions taken</li>
              <li><strong className="text-shop-fg">Device information:</strong> IP address, browser type, and device identifiers when you access our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">3. How we use your information</h2>
            <p className="leading-relaxed mb-3">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Process and fulfil your orders</li>
              <li>Communicate with you about your orders and enquiries</li>
              <li>Improve our website, products, and services</li>
              <li>Send you relevant updates or marketing (with your consent)</li>
              <li>Comply with legal obligations and protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">4. Sharing your information</h2>
            <p className="leading-relaxed">
              We do not sell your personal information. We may share your information with service providers who
              assist us (e.g. payment processors, delivery partners) under strict confidentiality agreements. We
              may also disclose information when required by law or to protect our rights and safety.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">5. Data security</h2>
            <p className="leading-relaxed">
              We implement appropriate technical and organisational measures to protect your personal information
              against unauthorised access, alteration, disclosure, or destruction. However, no method of
              transmission over the internet is completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">6. Data retention</h2>
            <p className="leading-relaxed">
              We retain your information for as long as necessary to fulfil the purposes described in this policy,
              including to comply with legal, accounting, or reporting requirements. Order and account data may be
              retained for a reasonable period after your last activity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">7. Your rights</h2>
            <p className="leading-relaxed">
              Depending on applicable law, you may have the right to access, correct, or delete your personal
              information. You may also have the right to object to or restrict certain processing. To exercise
              these rights, please contact us through our contact page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">8. Cookies and tracking</h2>
            <p className="leading-relaxed">
              We may use cookies and similar technologies to enhance your experience, analyse usage, and remember
              your preferences. You can adjust your browser settings to refuse cookies, though some features may
              not function properly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">9. Changes to this policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an
              updated &quot;Last updated&quot; date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-shop-fg mb-3">10. Contact us</h2>
            <p className="leading-relaxed">
              For questions about this Privacy Policy or our data practices, please contact us through our contact page.
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
            href="/terms"
            className="inline-flex items-center gap-2 px-6 py-3 border border-shop-border text-shop-fg font-semibold rounded-lg hover:bg-shop-card transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </main>
    </div>
  );
}
