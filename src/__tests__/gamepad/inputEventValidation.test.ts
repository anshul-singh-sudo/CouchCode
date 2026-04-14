// Feature: couchcode-platform, Property 5: Input Event Validation Allowlist

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateInputEvent } from "@/lib/inputEvent";

/**
 * Validates: Requirements 7.6, 7.7, 27.7
 *
 * Property 5: Input Event Validation Allowlist
 * For any 7-byte sequence, validator accepts iff:
 *   byte 0 (playerId) ∈ {1..4}
 *   byte 1 (buttonId) ∈ {0..11}
 *   byte 2 (state)    ∈ {0,1}
 * All other sequences SHALL be rejected.
 */
describe("Property 5: Input Event Validation Allowlist", () => {
  it("accepts iff playerId ∈ {1..4}, buttonId ∈ {0..11}, state ∈ {0,1}", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 7, maxLength: 7 }),
        (bytes) => {
          const playerId = bytes[0];
          const buttonId = bytes[1];
          const state = bytes[2];

          const shouldBeValid =
            playerId >= 1 && playerId <= 4 &&
            buttonId >= 0 && buttonId <= 11 &&
            (state === 0 || state === 1);

          expect(validateInputEvent(bytes)).toBe(shouldBeValid);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("rejects buffers that are not exactly 7 bytes", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 20 }).filter((a) => a.length !== 7),
        (bytes) => {
          expect(validateInputEvent(bytes)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("accepts all valid combinations explicitly", () => {
    for (let playerId = 1; playerId <= 4; playerId++) {
      for (const buttonId of [0, 5, 11]) {
        for (const state of [0, 1]) {
          const bytes = new Uint8Array(7);
          bytes[0] = playerId;
          bytes[1] = buttonId;
          bytes[2] = state;
          expect(validateInputEvent(bytes)).toBe(true);
        }
      }
    }
  });

  it("rejects playerId=0 and playerId=5", () => {
    const bytes = new Uint8Array(7);
    bytes[1] = 0; // valid buttonId
    bytes[2] = 0; // valid state

    bytes[0] = 0;
    expect(validateInputEvent(bytes)).toBe(false);

    bytes[0] = 5;
    expect(validateInputEvent(bytes)).toBe(false);
  });

  it("rejects buttonId=12 and above", () => {
    const bytes = new Uint8Array(7);
    bytes[0] = 1; // valid playerId
    bytes[2] = 0; // valid state

    bytes[1] = 12;
    expect(validateInputEvent(bytes)).toBe(false);

    bytes[1] = 255;
    expect(validateInputEvent(bytes)).toBe(false);
  });

  it("rejects state values other than 0 or 1", () => {
    const bytes = new Uint8Array(7);
    bytes[0] = 1; // valid playerId
    bytes[1] = 0; // valid buttonId

    bytes[2] = 2;
    expect(validateInputEvent(bytes)).toBe(false);

    bytes[2] = 255;
    expect(validateInputEvent(bytes)).toBe(false);
  });
});
