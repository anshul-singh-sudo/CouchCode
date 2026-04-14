"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SubscriptionCardProps {
  tier: "free" | "pro";
  status: string | null;
  renewalDate: string | null;
  plan: string | null;
}

/**
 * Subscription status card for the dashboard.
 * Shows current tier, renewal date, and upgrade/manage CTA.
 * Requirements: 17.1, 17.8
 */
export default function SubscriptionCard({
  tier,
  status,
  renewalDate,
  plan,
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  async function handleManage() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  const formattedRenewal = renewalDate
    ? new Date(renewalDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Subscription</CardTitle>
        <Badge variant={tier === "pro" ? "default" : "secondary"}>
          {tier === "pro" ? "Pro" : "Free"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {tier === "pro" ? (
          <>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                Status:{" "}
                <span className="font-medium text-foreground capitalize">
                  {status ?? "active"}
                </span>
              </p>
              {formattedRenewal && (
                <p className="text-muted-foreground">
                  Renews on:{" "}
                  <span className="font-medium text-foreground">
                    {formattedRenewal}
                  </span>
                </p>
              )}
              <p className="text-muted-foreground">
                Plan:{" "}
                <span className="font-medium text-foreground">
                  Pro — $9.99/month
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManage}
              disabled={loading}
            >
              {loading ? "Loading..." : "Manage Subscription"}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                You&apos;re on the free tier. Upgrade to Pro for:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>No advertisements</li>
                <li>Unlimited save states</li>
                <li>All gameplay modes (1, 2, 3, 4)</li>
                <li>Full game library access</li>
              </ul>
            </div>
            <Button size="sm" onClick={handleUpgrade} disabled={loading}>
              {loading ? "Loading..." : "Upgrade to Pro — $9.99/month"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
