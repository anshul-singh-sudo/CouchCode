// Feature: couchcode-platform, Property 2: Session Code Format and Uniqueness
import { describe, it } from "vitest";
import * as fc from "fast-check";
import { generateUniqueCodes } from "@/lib/sessionCode";

const SESSION_CODE_PATTERN = /^[A-Z0-9]{5}$/;

describe("Property 2: Session Code Format and Uniqueness", () => {
  it("every code in a batch is exactly 5 chars, matches [A-Z0-9]{5}, and all codes are unique", () => {
    // Validates: Requirements 3.1, 3.4
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (n) => {
        const codes = generateUniqueCodes(n);

        // Correct batch size
        if (codes.length !== n) return false;

        // Every code matches format
        for (const code of codes) {
          if (code.length !== 5) return false;
          if (!SESSION_CODE_PATTERN.test(code)) return false;
        }

        // All codes are unique
        const unique = new Set(codes);
        if (unique.size !== n) return false;

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
