import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './components/Providers';

export const metadata: Metadata = {
  title: 'hhourssop Admin',
  description: 'hhourssop admin dashboard',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 min-h-screen" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
