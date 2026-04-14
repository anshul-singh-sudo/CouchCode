"use client";

import { useQuery } from "@tanstack/react-query";

export interface SubscriptionData {
  tier: "free" | "pro";
  status: string | null;
  renewalDate: string | null;
  plan: string | null;
}

async function fetchSubscription(): Promise<SubscriptionData> {
  const res = await fetch("/api/subscriptions/status");
  if (!res.ok) throw new Error("Failed to fetch subscription");
  return res.json();
}

/**
 * React Query hook for current user subscription status.
 * Requirements: 17.1, 17.8
 */
export function useSubscription() {
  return useQuery<SubscriptionData>({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
    staleTime: 60_000, // 1 minute
  });
}
