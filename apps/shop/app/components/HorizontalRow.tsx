'use client';

type HorizontalRowProps = {
  title: string;
  viewAllHref?: string;
  children: React.ReactNode;
};

export default function HorizontalRow({ title, viewAllHref, children }: HorizontalRowProps) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold text-shop-fg">{title}</h2>
        {viewAllHref && (
          <a
            href={viewAllHref}
            className="text-sm font-medium text-shop-accent hover:text-shop-accent-hover transition-colors"
          >
            View all
          </a>
        )}
      </div>
      <div className="horizontal-scroll">
        <div className="flex items-stretch gap-4 px-4 sm:px-6 lg:px-8 pb-2">
          {children}
        </div>
      </div>
    </section>
  );
}
