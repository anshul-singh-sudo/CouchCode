'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA install banner.
 *
 * Shows after 30 seconds of use OR on the second+ visit
 * (tracked via localStorage visitCount).
 * Listens for the `beforeinstallprompt` event to trigger the native install flow.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Don't show if user already dismissed permanently
    if (localStorage.getItem('pwa-install-dismissed') === 'true') return;

    // Track visit count
    const visitCount = parseInt(localStorage.getItem('visitCount') ?? '0', 10) + 1;
    localStorage.setItem('visitCount', String(visitCount));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show immediately on second+ visit
      if (visitCount >= 2) {
        setVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also show after 30 seconds regardless of visit count
    const timer = setTimeout(() => {
      setDeferredPrompt((current) => {
        if (current) setVisible(true);
        return current;
      });
    }, 30_000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!visible || dismissed || !deferredPrompt) return null;

  return (
    <div
      role="banner"
      aria-label="Install CouchCode app"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl border border-purple-700 bg-[#1a1a2e] p-4 shadow-2xl"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-600">
          <Download className="h-5 w-5 text-white" aria-hidden="true" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Install CouchCode</p>
          <p className="mt-0.5 text-xs text-gray-400">
            Add to your home screen for the best experience.
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          onClick={handleInstall}
          size="sm"
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
        >
          Install
        </Button>
        <Button
          onClick={handleDismiss}
          size="sm"
          variant="outline"
          className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
