'use client';

import Link from 'next/link';

type ServicePackage = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  priceLabel: string;
  cadence?: string | null;
  features: string[];
  ctaLabel: string;
};

export default function PackagesSection({ packages }: { packages: ServicePackage[] }) {
  const displayPackages =
    packages.length > 0
      ? packages
      : [
          {
            id: 'starter-fallback',
            slug: 'starter',
            name: 'Starter support',
            shortDescription: 'A practical entry package for brands that need consistency and a clear publishing rhythm.',
            priceLabel: 'Custom quote',
            cadence: 'Monthly retainer',
            features: ['Content planning', 'Basic design support', 'Publishing assistance'],
            ctaLabel: 'Ask about this package',
          },
          {
            id: 'growth-fallback',
            slug: 'growth',
            name: 'Growth management',
            shortDescription: 'For businesses that need more hands-on management, reporting, and day-to-day campaign support.',
            priceLabel: 'Custom quote',
            cadence: 'Monthly retainer',
            features: ['Campaign support', 'Performance reporting', 'Community engagement'],
            ctaLabel: 'Request package details',
          },
          {
            id: 'full-fallback',
            slug: 'full-service',
            name: 'Full social management',
            shortDescription: 'A more complete management option for brands that want strategy, execution, and optimization handled.',
            priceLabel: 'Custom quote',
            cadence: 'Monthly retainer',
            features: ['Strategy oversight', 'Content coordination', 'Ongoing optimization'],
            ctaLabel: 'Talk to our team',
          },
        ];

  return (
    <section id="packages" className="scroll-mt-28">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-shop-muted">
            Social media packages
          </p>
        </div>
        <Link
          href="/contact"
          className="text-sm font-medium text-shop-accent transition-colors hover:text-shop-accent-hover"
        >
          Request a custom quote
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {displayPackages.map((pkg, index) => (
          <article
            key={pkg.id}
            className={`rounded-[28px] border p-6 shadow-sm transition-transform hover:-translate-y-1 ${
              index === 1
                ? 'border-shop-accent bg-[linear-gradient(180deg,rgba(37,99,235,0.06),rgba(37,99,235,0.02))]'
                : 'border-shop-border bg-shop-card'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-shop-fg">{pkg.name}</h3>
                <p className="mt-2 text-sm leading-6 text-shop-muted">{pkg.shortDescription}</p>
              </div>
              <span className="rounded-full border border-shop-border bg-shop-bg px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-shop-muted">
                {pkg.cadence || 'Flexible'}
              </span>
            </div>

            <div className="mt-6 border-t border-shop-border pt-5">
              <p className="text-3xl font-semibold tracking-tight text-shop-fg">{pkg.priceLabel}</p>
              {pkg.cadence && <p className="mt-1 text-sm text-shop-muted">{pkg.cadence}</p>}
            </div>

            <ul className="mt-6 space-y-3">
              {pkg.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-shop-muted">
                  <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-shop-accent" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/contact"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-shop-fg px-5 py-3 text-sm font-semibold text-shop-bg transition-opacity hover:opacity-90"
            >
              {pkg.ctaLabel}
            </Link>
          </article>
        ))}
      </div>

      {packages.length === 0 && (
        <p className="mt-4 text-sm text-shop-muted">
          These are placeholder package cards. You can replace them from the admin `Packages` area.
        </p>
      )}
    </section>
  );
}
