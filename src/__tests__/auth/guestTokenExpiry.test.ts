// Feature: couchcode-platform, Property 10: Guest Token Expiry
// @vitest-environment node
import { describe, it, beforeAll } from "vitest";
import * as fc from "fast-check";
import { signGuestToken, decodeGuestToken } from "@/lib/guestToken";

/**
 * Property 10: Guest Token Expiry
 *
 * For any guest token generated at time T, the JWT `exp` claim SHALL equal T + 86400.
 *
 * Validates: Requirements 16.3, 27.4
 */
describe("Property 10: Guest Token Expiry", () => {
  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-property-testing";
  });

  it("decoded.exp === T + 86400 for any integer T", async () => {
    // We use a reasonable range of Unix timestamps (year 2000 to year 2100)
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 946684800, max: 4102444800 }),
        async (T) => {
          const { token, exp: returnedExp } = await signGuestToken(T);

          // The returned exp from signGuestToken must equal T + 86400
          if (returnedExp !== T + 86400) return false;

          // Decode the JWT (without expiry validation) and check the exp claim
          const decoded = decodeGuestToken(token);
          return decoded.exp === T + 86400;
        }
      ),
      { numRuns: 100 }
    );
  });
});
