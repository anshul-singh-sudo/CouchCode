/**
 * Pure function to check whether adding a favorite is allowed.
 * Encapsulates the favorites count limit logic (max 50).
 */
export const MAX_FAVORITES = 50;

export interface FavoritesLimitResult {
  allowed: boolean;
  error?: string;
}

/**
 * checkFavoritesLimit
 *
 * Returns { allowed: true } when currentCount < maxCount,
 * and { allowed: false, error: "..." } when currentCount >= maxCount.
 */
export function checkFavoritesLimit(
  currentCount: number,
  maxCount: number = MAX_FAVORITES
): FavoritesLimitResult {
  if (currentCount >= maxCount) {
    return {
      allowed: false,
      error: `Favorites limit of ${maxCount} reached`,
    };
  }
  return { allowed: true };
}
