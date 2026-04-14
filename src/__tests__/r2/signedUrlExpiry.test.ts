// Feature: couchcode-platform, Property 9: Signed URL Expiry
// @vitest-environment node
import { describe, it, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

/**
 * Property 9: Signed URL Expiry
 *
 * For any valid ROM path, the generated signed URL SHALL have an expiry timestamp
 * in the range [now + 3599s, now + 3601s], ensuring the 1-hour expiry window is
 * correctly applied.
 *
 * Validates: Requirements 14.2, 27.1
 *
 * Note: We mock the S3Client and presigner since real R2 credentials are not
 * available in tests. We verify the expiry calculation logic directly by
 * capturing the `expiresIn` argument passed to getSignedUrl.
 */

// Mock the AWS SDK modules before importing r2.ts
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
  PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

let capturedExpiresIn: number | undefined;

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockImplementation(
    async (_client: unknown, _command: unknown, options: { expiresIn?: number }) => {
      capturedExpiresIn = options?.expiresIn;
      // Return a fake signed URL that encodes the expiry for inspection
      const now = Math.floor(Date.now() / 1000);
      const expiry = now + (options?.expiresIn ?? 3600);
      return `https://r2.example.com/fake-signed-url?X-Amz-Expires=${options?.expiresIn}&X-Amz-Date=${now}&expiry=${expiry}`;
    }
  ),
}));

describe("Property 9: Signed URL Expiry", () => {
  beforeEach(() => {
    capturedExpiresIn = undefined;
    process.env.R2_ENDPOINT = "https://fake.r2.cloudflarestorage.com";
    process.env.R2_ACCESS_KEY_ID = "fake-key";
    process.env.R2_SECRET_ACCESS_KEY = "fake-secret";
    process.env.R2_BUCKET_NAME = "test-bucket";
  });

  it("generateSignedGetUrl uses expiresIn=3600 by default for any ROM path", async () => {
    const { generateSignedGetUrl } = await import("@/lib/r2");

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (romPath) => {
          capturedExpiresIn = undefined;
          const before = Math.floor(Date.now() / 1000);
          await generateSignedGetUrl(romPath);
          const after = Math.floor(Date.now() / 1000);

          // The expiresIn passed to getSignedUrl must be 3600 (default)
          if (capturedExpiresIn !== 3600) return false;

          // The effective expiry window must be [now+3599, now+3601]
          const effectiveExpiry = before + capturedExpiresIn;
          return effectiveExpiry >= before + 3599 && effectiveExpiry <= after + 3601;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("generateSignedGetUrl respects custom expiresInSeconds for any ROM path", async () => {
    const { generateSignedGetUrl } = await import("@/lib/r2");

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 1, max: 86400 }),
        async (romPath, customExpiry) => {
          capturedExpiresIn = undefined;
          await generateSignedGetUrl(romPath, customExpiry);
          return capturedExpiresIn === customExpiry;
        }
      ),
      { numRuns: 100 }
    );
  });
});
