// Feature: couchcode-platform, Property 4: Input Event Serialization Round Trip

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  serializeInputEvent,
  deserializeInputEvent,
  type InputEvent,
} from "@/lib/inputEvent";

/**
 * Validates: Requirements 7.1, 7.4
 *
 * Property 4: Input Event Serialization Round Trip
 * For any valid (playerId ∈ {1,2,3,4}, buttonId ∈ {0..11}, state ∈ {0,1},
 * timestamp ∈ uint32), deserialize(serialize(event)) SHALL equal original.
 */
describe("Property 4: Input Event Serialization Round Trip", () => {
  it("deserialize(serialize(event)) equals original for all valid inputs", () => {
    fc.assert(
      fc.property(
        fc.record({
          playerId: fc.integer({ min: 1, max: 4 }),
          buttonId: fc.integer({ min: 0, max: 11 }),
          state: fc.integer({ min: 0, max: 1 }) as fc.Arbitrary<0 | 1>,
          timestamp: fc.integer({ min: 0, max: 4294967295 }),
        }),
        (event: InputEvent) => {
          const bytes = serializeInputEvent(event);
          const result = deserializeInputEvent(bytes);
          expect(result.playerId).toBe(event.playerId);
          expect(result.buttonId).toBe(event.buttonId);
          expect(result.state).toBe(event.state);
          expect(result.timestamp).toBe(event.timestamp);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("serialized output is always exactly 7 bytes", () => {
    fc.assert(
      fc.property(
        fc.record({
          playerId: fc.integer({ min: 1, max: 4 }),
          buttonId: fc.integer({ min: 0, max: 11 }),
          state: fc.integer({ min: 0, max: 1 }) as fc.Arbitrary<0 | 1>,
          timestamp: fc.integer({ min: 0, max: 4294967295 }),
        }),
        (event: InputEvent) => {
          const bytes = serializeInputEvent(event);
          expect(bytes.byteLength).toBe(7);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("timestamp boundary values round-trip correctly", () => {
    const boundaries = [0, 1, 2147483647, 2147483648, 4294967294, 4294967295];
    for (const timestamp of boundaries) {
      const event: InputEvent = { playerId: 1, buttonId: 0, state: 0, timestamp };
      const result = deserializeInputEvent(serializeInputEvent(event));
      expect(result.timestamp).toBe(timestamp);
    }
  });
});
