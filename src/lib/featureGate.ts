/**
 * Feature gating logic for CouchCode Platform.
 * Determines feature access based on user subscription tier.
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8
 */

export interface FeatureAccess {
  /** Whether ads should be shown to this user */
  showAds: boolean;
  /** Maximum number of save states per game (Infinity for pro) */
  saveStateLimit: number;
  /** Allowed gameplay modes */
  allowedModes: number[];
  /** Whether user has access to the full game library */
  fullLibrary: boolean;
}

export interface UserForGating {
  subscriptionTier?: string | null;
  subscription?: {
    status: string;
  } | null;
}

const FREE_TIER_ACCESS: FeatureAccess = {
  showAds: true,
  saveStateLimit: 1,
  allowedModes: [1],
  fullLibrary: false,
};

const PRO_TIER_ACCESS: FeatureAccess = {
  showAds: false,
  saveStateLimit: Infinity,
  allowedModes: [1, 2, 3, 4],
  fullLibrary: true,
};

/**
 * Returns the feature access set for a given user.
 *
 * A user is considered "pro" only when their subscription status is "active".
 * All other states (past_due, canceled, trialing, no subscription) fall back to free tier.
 *
 * Requirements: 17.4, 18.1–18.8
 */
export function getFeatureAccess(user: UserForGating): FeatureAccess {
  const isProActive =
    user.subscriptionTier === "pro" &&
    user.subscription?.status === "active";

  return isProActive ? PRO_TIER_ACCESS : FREE_TIER_ACCESS;
}
