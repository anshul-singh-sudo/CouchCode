import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Lazily initialize Redis client to avoid errors when env vars are missing at build time
let _redis: Redis | null = null;
let _rateLimit: Ratelimit | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

/**
 * Session creation rate limiter: sliding window, 5 requests per 3600s per IP.
 * Requirements: 3.7, 27.2, 27.3
 */
export const sessionRateLimit = {
  async limit(ip: string): Promise<{ success: boolean; reset: number; remaining: number }> {
    if (!_rateLimit) {
      _rateLimit = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(5, "3600 s"),
        prefix: "session_rl",
      });
    }
    const result = await _rateLimit.limit(ip);
    return {
      success: result.success,
      reset: result.reset,
      remaining: result.remaining,
    };
  },
};
