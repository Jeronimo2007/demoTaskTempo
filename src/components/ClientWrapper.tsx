'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/sw-register';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <>{children}</>;
}
