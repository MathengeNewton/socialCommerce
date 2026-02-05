'use client';

import { ToastProvider } from './ToastContext';
import { ConfirmProvider } from './ConfirmContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
    </ToastProvider>
  );
}
