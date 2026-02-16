import type { Metadata, Viewport } from 'next';
import './globals.css';
import ThemeProvider from './components/ThemeProvider';
import ThemeScript from './components/ThemeScript';
import CartProviderWrapper from './components/CartProviderWrapper';
import ShopFooter from './components/ShopFooter';
import { ToastProvider } from './context/ToastContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'hhourssop Shop',
  description: 'Shop at hhourssop',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
        <ThemeScript />
        <ThemeProvider>
          <CartProviderWrapper>
            <ToastProvider>
              <div className="flex-1 flex flex-col">{children}</div>
              <ShopFooter />
            </ToastProvider>
          </CartProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
