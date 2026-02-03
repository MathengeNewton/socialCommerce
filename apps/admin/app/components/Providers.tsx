'use client';

import '../demo/mockFetch'; // Side-effect: installs fetch mock when in demo mode
import { ToastProvider } from './ToastContext';
import { ConfirmProvider } from './ConfirmContext';
import DemoInit from '../demo/DemoInit';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <DemoInit />
        {children}
      </ConfirmProvider>
    </ToastProvider>
  );
}
