// Feature: couchcode-platform, Property 6: Tier-Based Feature Access Gating
// @vitest-environment node
import { describe, it } from "vitest";
import * as fc from "fast-check";
import { getFeatureAccess } from "@/lib/featureGate";

/**
 * Property 6: Tier-Based Feature Access Gating
 *
 * For any user object, `getFeatureAccess()` returns exactly the free-tier set
 * when subscription is not active, and exactly the pro-tier set when active.
 *
 * Validates: Requirements 17.4, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8
 */
describe("Property 6: Tier-Based Feature Access Gating", () => {
  const userArb = fc.record({
    subscriptionTier: fc.constantFrom("free", "pro"),
    subscription: fc.option(
      fc.record({
        status: fc.constantFrom("active", "past_due", "canceled", "trialing"),
      })
    ),
  });

  it("returns exactly free-tier set when subscription is not active", () => {
    fc.assert(
      fc.property(userArb, (user) => {
        const isActive =
          user.subscriptionTier === "pro" &&
          user.subscription?.status === "active";

        if (isActive) return true; // skip pro-active cases in this test

        const access = getFeatureAccess(user);

        // Free tier: Req 18.1, 18.2, 18.3, 18.4
        return (
          access.showAds === true &&
          access.saveStateLimit === 1 &&
          access.allowedModes.length === 1 &&
          access.allowedModes[0] === 1 &&
          access.fullLibrary === false
        );
      }),
      { numRuns: 200 }
    );
  });

  it("returns exactly pro-tier set when subscription is active", () => {
    const proActiveArb = fc.record({
      subscriptionTier: fc.constant("pro" as const),
      subscription: fc.record({
        status: fc.constant("active" as const),
      }),
    });

    fc.assert(
      fc.property(proActiveArb, (user) => {
        const access = getFeatureAccess(user);

        // Pro tier: Req 18.5, 18.6, 18.7, 18.8
        return (
          access.showAds === false &&
          access.saveStateLimit === Infinity &&
          access.allowedModes.length === 4 &&
          access.allowedModes.includes(1) &&
          access.allowedModes.includes(2) &&
          access.allowedModes.includes(3) &&
          access.allowedModes.includes(4) &&
          access.fullLibrary === true
        );
      }),
      { numRuns: 200 }
    );
  });

  it("non-active subscription statuses always yield free tier regardless of subscriptionTier field", () => {
    const nonActiveArb = fc.record({
      subscriptionTier: fc.constantFrom("free", "pro"),
      subscription: fc.option(
        fc.record({
          status: fc.constantFrom("past_due", "canceled", "trialing"),
        })
      ),
    });

    fc.assert(
      fc.property(nonActiveArb, (user) => {
        const access = getFeatureAccess(user);

        return (
          access.showAds === true &&
          access.saveStateLimit === 1 &&
          access.allowedModes.length === 1 &&
          access.fullLibrary === false
        );
      }),
      { numRuns: 200 }
    );
  });
});
