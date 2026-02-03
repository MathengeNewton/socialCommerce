'use client';

import { useEffect } from 'react';
import { installMockFetch, enableDemoMode, isDemoMode } from './mockFetch';
import DemoBanner from './DemoBanner';

export default function DemoInit() {
  useEffect(() => {
    installMockFetch();
    // If URL has ?demo=1, enable demo mode and clean URL
    if (typeof window !== 'undefined' && window.location.search.includes('demo=1') && !isDemoMode()) {
      enableDemoMode();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return <DemoBanner />;
}
