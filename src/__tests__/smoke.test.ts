import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// Smoke test — verifies the testing infrastructure is wired correctly
describe("Testing infrastructure", () => {
  it("vitest is working", () => {
    expect(1 + 1).toBe(2);
  });

  it("fast-check is working", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        // Commutativity of addition
        return a + b === b + a;
      })
    );
  });
});
