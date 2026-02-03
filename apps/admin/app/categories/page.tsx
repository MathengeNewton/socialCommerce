'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CategoriesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/catalog?tab=categories');
  }, [router]);
  return null;
}
