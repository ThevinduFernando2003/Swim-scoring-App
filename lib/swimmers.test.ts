import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findDuplicateWarnings,
  foldSwimmerName,
  isNearDuplicateName,
  namesMatch,
} from "./swimmers.ts";

test("folded names treat punctuation as the same person", () => {
  assert.equal(foldSwimmerName("C. D. Ampavila"), "c d ampavila");
  assert.ok(namesMatch("C. D. Ampavila", "C D Ampavila"));
});

test("near-duplicates flag similar spellings on the same team", () => {
  assert.ok(isNearDuplicateName("C. D. Ampavila", "C. D. Ampawila"));
  assert.equal(namesMatch("C. D. Ampavila", "C. D. Ampawila"), false);
});

test("exact folded names are matches, not near-duplicates", () => {
  assert.equal(isNearDuplicateName("Jane Doe", "jane  doe"), false);
});

test("review warnings list likely duplicates without auto-merging", () => {
  const warnings = findDuplicateWarnings(
    [
      { swimmer_name: "C. D. Ampawila", team_code: "COL" },
      { swimmer_name: "Someone Else", team_code: "COL" },
    ],
    [{ name: "C. D. Ampavila", team_code: "COL" }],
    [{ id: 1, code: "COL" }],
  );
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].teamCode, "COL");
  assert.ok(warnings[0].matches.includes("C. D. Ampavila"));
});
