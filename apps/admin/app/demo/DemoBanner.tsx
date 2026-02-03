'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isDemoMode, disableDemoMode } from './mockFetch';

export default function DemoBanner() {
  const [show, setShow] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setShow(isDemoMode());
  }, []);

  const handleExit = () => {
    disableDemoMode();
    setShow(false);
    router.push('/login');
  };

  if (!show) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="animate-pulse">🎬</span>
        <span>Demo mode – TikTok Login Kit & Content Posting API (user.info.basic, video.publish, video.upload)</span>
      </div>
      <button
        type="button"
        onClick={handleExit}
        className="px-3 py-1 rounded-md bg-amber-600 text-amber-950 font-semibold text-sm hover:bg-amber-700 transition-colors"
      >
        Exit demo
      </button>
    </div>
    <div className="h-10" aria-hidden />
    </>
  );
}
