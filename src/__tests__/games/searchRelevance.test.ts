// Feature: couchcode-platform, Property 11: Game Search Relevance
// @vitest-environment node
import { describe, it } from "vitest";
import * as fc from "fast-check";
import { filterBySearch } from "@/lib/gameUtils";

/**
 * Property 11: Game Search Relevance
 *
 * For any non-empty search query string and any game library, every game returned
 * by the search function SHALL have a title that contains the query string
 * (case-insensitive), and no game whose title does not contain the query SHALL
 * appear in the results.
 *
 * Validates: Requirements 13.2
 */
describe("Property 11: Game Search Relevance", () => {
  it("every result title contains the query (case-insensitive)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.array(fc.record({ title: fc.string() })),
        (query, gameList) => {
          const results = filterBySearch(gameList, query);
          const lower = query.toLowerCase();

          // Every result must contain the query
          const allMatch = results.every((g) =>
            g.title.toLowerCase().includes(lower)
          );

          // No non-matching title should appear
          const noFalsePositives = results.every((g) =>
            g.title.toLowerCase().includes(lower)
          );

          return allMatch && noFalsePositives;
        }
      ),
      { numRuns: 200 }
    );
  });

  it("no game whose title does not contain the query appears in results", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.array(fc.record({ title: fc.string() })),
        (query, gameList) => {
          const results = filterBySearch(gameList, query);
          const lower = query.toLowerCase();
          const resultTitles = new Set(results.map((g) => g.title));

          // Every game NOT in results should NOT match the query
          const nonResults = gameList.filter((g) => !resultTitles.has(g.title));
          return nonResults.every(
            (g) => !g.title.toLowerCase().includes(lower)
          );
        }
      ),
      { numRuns: 200 }
    );
  });
});
