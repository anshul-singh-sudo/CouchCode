'use client';

import { useEffect } from 'react';

/**
 * Registers the CouchCode service worker.
 * Must be rendered inside a Client Component tree (e.g. root layout body).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[SW] Registered, scope:', registration.scope);
      })
      .catch((err) => {
        console.error('[SW] Registration failed:', err);
      });
  }, []);

  return null;
}
