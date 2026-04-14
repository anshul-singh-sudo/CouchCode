"use client";

import { useEffect, useRef, useState } from "react";

interface AdSlotProps {
  /** Whether ads should be shown (from getFeatureAccess) */
  showAds: boolean;
  /** Google AdSense ad unit ID */
  adUnit: string;
  /** Optional game ID for impression tracking */
  gameId?: string;
  /** Ad slot dimensions */
  width?: number;
  height?: number;
  className?: string;
}

/**
 * AdSlot component — renders a Google AdSense unit or placeholder.
 * Only mounts the ad when showAds === true.
 * Records an ad impression via POST /api/ad-impressions on display.
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7
 */
export function AdSlot({
  showAds,
  adUnit,
  gameId,
  width = 728,
  height = 90,
  className,
}: AdSlotProps) {
  const recorded = useRef(false);

  useEffect(() => {
    if (!showAds || recorded.current) return;
    recorded.current = true;

    // Record ad impression
    fetch("/api/ad-impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adUnit, gameId }),
    }).catch((err) => console.error("Failed to record ad impression:", err));

    // Push AdSense ad
    try {
      // @ts-expect-error adsbygoogle is injected by Google AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense not loaded in dev/test environments
    }
  }, [showAds, adUnit, gameId]);

  if (!showAds) return null;

  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  // In development or when AdSense is not configured, show a placeholder
  if (!adsenseClientId) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          background: "#f0f0f0",
          border: "1px dashed #ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#999",
          fontSize: 12,
          borderRadius: 4,
        }}
        aria-label="Advertisement placeholder"
      >
        Advertisement
      </div>
    );
  }

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", width, height }}
        data-ad-client={adsenseClientId}
        data-ad-slot={adUnit}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

/**
 * GameplayAdSlot — enforces 1 ad per 5 minutes of gameplay via a client-side timer.
 * Requirements: 19.5, 19.6
 */
export function GameplayAdSlot({
  showAds,
  adUnit,
  gameId,
}: Pick<AdSlotProps, "showAds" | "adUnit" | "gameId">) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const AD_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (!showAds) return;

    // Show first ad after 5 minutes, then every 5 minutes
    timerRef.current = setInterval(() => {
      setVisible(true);
      // Hide after 30 seconds
      setTimeout(() => setVisible(false), 30_000);
    }, AD_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showAds]);

  if (!showAds || !visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-lg p-4 shadow-xl">
        <p className="text-xs text-muted-foreground mb-2 text-center">Advertisement</p>
        <AdSlot showAds={showAds} adUnit={adUnit} gameId={gameId} width={300} height={250} />
        <button
          className="mt-2 text-xs text-muted-foreground underline w-full text-center"
          onClick={() => setVisible(false)}
        >
          Close
        </button>
      </div>
    </div>
  );
}
