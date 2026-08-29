import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseExtractionJson } from "./extraction.ts";

const fixture = JSON.parse(
  readFileSync("fixtures/event-5-results.json", "utf8"),
) as { results: unknown[] };

test("parses Event 5 fixture JSON", () => {
  const parsed = parseExtractionJson(JSON.stringify(fixture));
  assert.equal(parsed.event_number, 5);
  assert.equal(parsed.results[0].team_code, "COL");
  assert.equal(parsed.results[parsed.results.length - 1].status, "DNS");
});

test("strips markdown fences from model output", () => {
  const parsed = parseExtractionJson(
    "```json\n" + JSON.stringify(fixture) + "\n```",
  );
  assert.equal(parsed.results.length, fixture.results.length);
});
