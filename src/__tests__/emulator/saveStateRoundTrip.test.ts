// Feature: couchcode-platform, Property 1: Save State Round Trip
// Validates: Requirements 1.10, 2.1, 2.3

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { serialize, deserialize } from "@/lib/saveStateSerializer";

describe("Property 1: Save State Round Trip", () => {
  it("deserialize(serialize(state)) is byte-for-byte equal to the original", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 65536 }),
        (state) => {
          const serialized = serialize(state);
          const restored = deserialize(serialized);

          // Must have same length
          expect(restored.length).toBe(state.length);

          // Must be byte-for-byte identical
          for (let i = 0; i < state.length; i++) {
            if (restored[i] !== state[i]) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("serialized output is larger than input by exactly the header size", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 65536 }),
        (state) => {
          const serialized = serialize(state);
          // Header is 8 bytes (4 magic + 4 length)
          expect(serialized.length).toBe(state.length + 8);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("deserialize throws on truncated data", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 7 }),
        (shortData) => {
          expect(() => deserialize(shortData)).toThrow();
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it("deserialize throws on invalid magic bytes", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 1000 }),
        (state) => {
          const serialized = serialize(state);
          // Corrupt the first magic byte
          serialized[0] = 0x00;
          expect(() => deserialize(serialized)).toThrow(/magic/i);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
