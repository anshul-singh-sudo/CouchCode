// Feature: couchcode-platform, Property 12: Game List Sort Correctness
// @vitest-environment node
import { describe, it } from "vitest";
import * as fc from "fast-check";
import { sortGameList, type SortKey } from "@/lib/gameUtils";

/**
 * Property 12: Game List Sort Correctness
 *
 * For any game list and any valid sort key (title, releaseYear, totalPlays),
 * the sorted output SHALL satisfy the ordering invariant: for all adjacent pairs
 * (a, b) in the result, sortKey(a) <= sortKey(b).
 *
 * Validates: Requirements 13.8
 */
describe("Property 12: Game List Sort Correctness", () => {
  const gameArb = fc.record({
    title: fc.string(),
    releaseYear: fc.integer({ min: 1970, max: 2030 }),
    totalPlays: fc.nat(),
  });

  it("sorted by title: adjacent pairs satisfy title(a) <= title(b)", () => {
    fc.assert(
      fc.property(fc.array(gameArb), (gameList) => {
        const sorted = sortGameList(gameList, "title");
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].title.localeCompare(sorted[i + 1].title) > 0) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });

  it("sorted by releaseYear: adjacent pairs satisfy releaseYear(a) <= releaseYear(b)", () => {
    fc.assert(
      fc.property(fc.array(gameArb), (gameList) => {
        const sorted = sortGameList(gameList, "releaseYear");
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = sorted[i].releaseYear ?? 0;
          const b = sorted[i + 1].releaseYear ?? 0;
          if (a > b) return false;
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });

  it("sorted by totalPlays: adjacent pairs satisfy totalPlays(a) <= totalPlays(b)", () => {
    fc.assert(
      fc.property(fc.array(gameArb), (gameList) => {
        const sorted = sortGameList(gameList, "totalPlays");
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].totalPlays > sorted[i + 1].totalPlays) return false;
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });

  it("all sort keys produce correct ordering for any game list", () => {
    const sortKeys: SortKey[] = ["title", "releaseYear", "totalPlays"];
    fc.assert(
      fc.property(
        fc.array(gameArb),
        fc.constantFrom(...sortKeys),
        (gameList, key) => {
          const sorted = sortGameList(gameList, key);
          for (let i = 0; i < sorted.length - 1; i++) {
            if (key === "title") {
              if (sorted[i].title.localeCompare(sorted[i + 1].title) > 0)
                return false;
            } else if (key === "releaseYear") {
              const a = sorted[i].releaseYear ?? 0;
              const b = sorted[i + 1].releaseYear ?? 0;
              if (a > b) return false;
            } else {
              if (sorted[i].totalPlays > sorted[i + 1].totalPlays) return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 200 }
    );
  });
});
