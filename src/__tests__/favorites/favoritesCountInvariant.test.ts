// Feature: couchcode-platform, Property 13: Favorites Count Invariant
// @vitest-environment node
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { checkFavoritesLimit, MAX_FAVORITES } from "@/lib/favoritesLimit";

/**
 * Property 13: Favorites Count Invariant
 *
 * For any user with N favorites (0–50), adding one more succeeds when N < 50;
 * when N = 50, adding returns an error and the list is unchanged.
 *
 * Validates: Requirements 29.6
 */
describe("Property 13: Favorites Count Invariant", () => {
  it("adding a favorite succeeds when current count is below the limit", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_FAVORITES - 1 }),
        (currentCount) => {
          const result = checkFavoritesLimit(currentCount, MAX_FAVORITES);
          return result.allowed === true && result.error === undefined;
        }
      ),
      { numRuns: 200 }
    );
  });

  it("adding a favorite is rejected when current count equals the limit", () => {
    const result = checkFavoritesLimit(MAX_FAVORITES, MAX_FAVORITES);
    expect(result.allowed).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("adding a favorite is rejected when current count exceeds the limit", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_FAVORITES, max: MAX_FAVORITES + 100 }),
        (currentCount) => {
          const result = checkFavoritesLimit(currentCount, MAX_FAVORITES);
          return result.allowed === false && typeof result.error === "string";
        }
      ),
      { numRuns: 100 }
    );
  });

  it("boundary: count=49 allows, count=50 rejects", () => {
    expect(checkFavoritesLimit(49, MAX_FAVORITES).allowed).toBe(true);
    expect(checkFavoritesLimit(50, MAX_FAVORITES).allowed).toBe(false);
  });

  it("for any count in 0..51, result is consistent with the limit invariant", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 51 }),
        (currentCount) => {
          const result = checkFavoritesLimit(currentCount, MAX_FAVORITES);
          if (currentCount < MAX_FAVORITES) {
            return result.allowed === true;
          } else {
            return result.allowed === false && typeof result.error === "string";
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
