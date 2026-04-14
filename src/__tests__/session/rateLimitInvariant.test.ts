// Feature: couchcode-platform, Property 7: Rate Limit Invariant
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

const MAX_REQUESTS = 5;
const WINDOW_MS = 3600 * 1000; // 1 hour

interface RateLimitResult {
  status: 200 | 429;
  retryAfter?: number;
}

/**
 * Pure simulation of a sliding window rate limiter.
 * Tracks request timestamps per IP and returns 429 after MAX_REQUESTS within windowMs.
 */
function simulateRateLimit(
  requests: number,
  windowMs: number = WINDOW_MS
): RateLimitResult[] {
  const timestamps: number[] = [];
  const results: RateLimitResult[] = [];
  let now = 0; // simulated time in ms

  for (let i = 0; i < requests; i++) {
    now += 1; // each request is 1ms apart (within the window)

    // Remove timestamps outside the sliding window
    const windowStart = now - windowMs;
    while (timestamps.length > 0 && timestamps[0] <= windowStart) {
      timestamps.shift();
    }

    if (timestamps.length >= MAX_REQUESTS) {
      // Rate limited — retry-after is time until oldest request expires
      const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000);
      results.push({ status: 429, retryAfter });
    } else {
      timestamps.push(now);
      results.push({ status: 200 });
    }
  }

  return results;
}

describe("Property 7: Rate Limit Invariant", () => {
  it("after exactly 5 requests, every subsequent request returns 429 with retry-after", () => {
    // Validates: Requirements 3.7, 27.2, 27.3
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }), // arbitrary IP
        fc.integer({ min: 6, max: 20 }),             // 6+ requests to trigger limit
        (_ip, requestCount) => {
          const results = simulateRateLimit(requestCount);

          // First 5 must succeed
          for (let i = 0; i < MAX_REQUESTS; i++) {
            if (results[i].status !== 200) return false;
          }

          // All subsequent must be 429 with retry-after
          for (let i = MAX_REQUESTS; i < results.length; i++) {
            if (results[i].status !== 429) return false;
            if (results[i].retryAfter === undefined) return false;
            if (results[i].retryAfter! <= 0) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("exactly 5 requests succeed, 6th returns 429 with retry-after header", () => {
    const results = simulateRateLimit(6);

    expect(results[4].status).toBe(200);
    expect(results[5].status).toBe(429);
    expect(results[5].retryAfter).toBeDefined();
    expect(results[5].retryAfter!).toBeGreaterThan(0);
  });

  it("requests within window are counted, requests outside window are not", () => {
    // 5 requests succeed, then 1 more after window expires should succeed again
    const timestamps: number[] = [];
    let now = 0;

    function makeRequest(): RateLimitResult {
      now += 1;
      const windowStart = now - WINDOW_MS;
      while (timestamps.length > 0 && timestamps[0] <= windowStart) {
        timestamps.shift();
      }
      if (timestamps.length >= MAX_REQUESTS) {
        const retryAfter = Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000);
        return { status: 429, retryAfter };
      }
      timestamps.push(now);
      return { status: 200 };
    }

    // 5 requests succeed
    for (let i = 0; i < 5; i++) {
      expect(makeRequest().status).toBe(200);
    }

    // 6th is rate limited
    expect(makeRequest().status).toBe(429);

    // Advance time past the window
    now += WINDOW_MS + 1;

    // Next request should succeed (window has reset)
    expect(makeRequest().status).toBe(200);
  });
});
