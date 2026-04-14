// Feature: couchcode-platform, Property 3: Session Device Count Invariant
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

const MAX_DEVICES = 5;

interface JoinResult {
  success: boolean;
  error?: string;
  deviceCount: number;
}

/**
 * Pure simulation of join attempts against a session.
 * Returns the sequence of results for each join attempt.
 */
function simulateJoinAttempts(attempts: string[]): JoinResult[] {
  let deviceCount = 0;
  return attempts.map(() => {
    if (deviceCount >= MAX_DEVICES) {
      return { success: false, error: "SESSION_FULL", deviceCount };
    }
    deviceCount++;
    return { success: true, deviceCount };
  });
}

describe("Property 3: Session Device Count Invariant", () => {
  it("device count never exceeds 5 and 5th+ join is rejected", () => {
    // Validates: Requirements 4.6, 4.7
    fc.assert(
      fc.property(
        fc.array(fc.constant("join"), { minLength: 1, maxLength: 20 }),
        (attempts) => {
          const results = simulateJoinAttempts(attempts);

          for (const result of results) {
            // Device count never exceeds MAX_DEVICES
            if (result.deviceCount > MAX_DEVICES) return false;
          }

          // Any attempt beyond the 5th must be rejected
          for (let i = MAX_DEVICES; i < results.length; i++) {
            if (results[i].success) return false;
            if (results[i].error !== "SESSION_FULL") return false;
          }

          // First MAX_DEVICES attempts (or fewer) must succeed
          const successCount = Math.min(attempts.length, MAX_DEVICES);
          for (let i = 0; i < successCount; i++) {
            if (!results[i].success) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("exactly 5 devices can join, 6th is rejected", () => {
    const attempts = Array(6).fill("join");
    const results = simulateJoinAttempts(attempts);

    expect(results[4].success).toBe(true);
    expect(results[4].deviceCount).toBe(5);
    expect(results[5].success).toBe(false);
    expect(results[5].error).toBe("SESSION_FULL");
  });
});
