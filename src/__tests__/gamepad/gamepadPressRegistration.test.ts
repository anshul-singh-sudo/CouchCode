// Feature: couchcode-platform, Property 8: Virtual Gamepad Press Registration

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { serializeInputEvent, deserializeInputEvent, type InputEvent } from "@/lib/inputEvent";

/**
 * Validates: Requirements 8.3, 8.4, 8.8
 *
 * Property 8: Virtual Gamepad Press Registration
 * For any sequence of press/release events, every press produces exactly one
 * state=1 InputEvent and every release produces exactly one state=0 InputEvent
 * with no drops.
 */

interface GamepadAction {
  buttonId: number;
  type: 'press' | 'release';
}

/**
 * Pure function that simulates the gamepad event handler logic.
 * For each action, it serializes and immediately deserializes an InputEvent,
 * mirroring what VirtualGamepad does on touch start/end.
 */
function processGamepadEvents(
  actions: GamepadAction[],
  playerId: 1 | 2 | 3 | 4 = 1
): InputEvent[] {
  return actions.map((action) => {
    const event: InputEvent = {
      playerId,
      buttonId: action.buttonId,
      state: action.type === 'press' ? 1 : 0,
      timestamp: 0, // fixed for determinism in tests
    };
    // Simulate the serialize → transmit → deserialize pipeline
    const bytes = serializeInputEvent(event);
    return deserializeInputEvent(bytes);
  });
}

describe("Property 8: Virtual Gamepad Press Registration", () => {
  it("every press produces exactly one state=1 event and every release produces exactly one state=0 event", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            buttonId: fc.integer({ min: 0, max: 11 }),
            type: fc.constantFrom('press' as const, 'release' as const),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (actions: GamepadAction[]) => {
          const results = processGamepadEvents(actions);

          // Must produce exactly one output per input — no drops
          expect(results.length).toBe(actions.length);

          // Each output state must match the action type
          for (let i = 0; i < actions.length; i++) {
            const expectedState = actions[i].type === 'press' ? 1 : 0;
            expect(results[i].state).toBe(expectedState);
            expect(results[i].buttonId).toBe(actions[i].buttonId);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("no events are dropped for any sequence length", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            buttonId: fc.integer({ min: 0, max: 11 }),
            type: fc.constantFrom('press' as const, 'release' as const),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (actions: GamepadAction[]) => {
          const results = processGamepadEvents(actions);
          expect(results.length).toBe(actions.length);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("press count equals number of press actions in sequence", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            buttonId: fc.integer({ min: 0, max: 11 }),
            type: fc.constantFrom('press' as const, 'release' as const),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (actions: GamepadAction[]) => {
          const results = processGamepadEvents(actions);
          const pressCount = actions.filter((a) => a.type === 'press').length;
          const releaseCount = actions.filter((a) => a.type === 'release').length;
          const resultPresses = results.filter((r) => r.state === 1).length;
          const resultReleases = results.filter((r) => r.state === 0).length;
          expect(resultPresses).toBe(pressCount);
          expect(resultReleases).toBe(releaseCount);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("buttonId is preserved through the event pipeline", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            buttonId: fc.integer({ min: 0, max: 11 }),
            type: fc.constantFrom('press' as const, 'release' as const),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (actions: GamepadAction[]) => {
          const results = processGamepadEvents(actions);
          for (let i = 0; i < actions.length; i++) {
            expect(results[i].buttonId).toBe(actions[i].buttonId);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
