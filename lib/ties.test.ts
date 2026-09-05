import assert from "node:assert/strict";
import { test } from "node:test";
import { applyTiedPlaces, formatPlace, tiedPositions } from "./ties.ts";
import type { ReviewedResult } from "./types.ts";

function row(
  position: number | null,
  achievement: string,
  status: ReviewedResult["result_status"] = "finished",
): ReviewedResult {
  return {
    position,
    swimmer_name: achievement,
    team_code: "COL",
    achievement,
    result_status: status,
  };
}

test("equal times share a place and skip the next", () => {
  const ranked = applyTiedPlaces([
    row(1, "02:08.03"),
    row(2, "02:08.03"),
    row(3, "02:10.00"),
  ]);
  assert.equal(ranked[0].position, 1);
  assert.equal(ranked[1].position, 1);
  assert.equal(ranked[2].position, 3);
});

test("three-way tie for first becomes 1, 1, 1, 4", () => {
  const ranked = applyTiedPlaces([
    row(null, "28.15"),
    row(null, "28.15"),
    row(null, "28.15"),
    row(null, "28.40"),
  ]);
  assert.deepEqual(
    ranked.map((item) => item.position),
    [1, 1, 1, 4],
  );
});

test("non-finishers keep their status and are not ranked from time", () => {
  const ranked = applyTiedPlaces([
    row(1, "02:08.03"),
    row(null, "DNS", "DNS"),
    row(2, "02:09.00"),
  ]);
  assert.equal(ranked[0].position, 1);
  assert.equal(ranked[1].position, null);
  assert.equal(ranked[1].result_status, "DNS");
  assert.equal(ranked[2].position, 2);
});

test("tiedPositions and formatPlace mark shared places", () => {
  const rows = [
    { position: 1, result_status: "finished" },
    { position: 1, result_status: "finished" },
    { position: 3, result_status: "finished" },
  ];
  const tied = tiedPositions(rows);
  assert.equal(tied.has(1), true);
  assert.equal(tied.has(3), false);
  assert.equal(formatPlace(1, true), "1=");
  assert.equal(formatPlace(3, false), "3");
});
