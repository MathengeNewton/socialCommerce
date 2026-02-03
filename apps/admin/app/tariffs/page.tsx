'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TariffsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/billing?tab=tariffs');
  }, [router]);

  return null;
}
