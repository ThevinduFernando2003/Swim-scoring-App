import assert from "node:assert/strict";
import { test } from "node:test";
import { toPublishRows, unknownTeamCodes } from "./publish.ts";
import type { ReviewedResult, Team } from "./types.ts";

const teams: Team[] = [
  { id: 1, code: "COL", name: "University of Colombo" },
  { id: 2, code: "SAB", name: "Sabaragamuwa University of Sri Lanka" },
  { id: 3, code: "WAY", name: "Wayamba University of Sri Lanka" },
];

const extracted: ReviewedResult[] = [
  {
    position: 1,
    swimmer_name: "C. D. Ampavila",
    team_code: "COL",
    achievement: "02:08.03",
    result_status: "finished",
  },
  {
    position: 2,
    swimmer_name: "G. G. A. M. S. Gamage",
    team_code: "SAB",
    achievement: "02:16.46",
    result_status: "finished",
  },
  {
    position: 16,
    swimmer_name: "R. C. P. T. B. Ariyawansa",
    team_code: "WAY",
    achievement: "DNS",
    result_status: "DNS",
  },
];

test("flags unknown team codes before publish", () => {
  const unknown = unknownTeamCodes(
    [{ ...extracted[0], team_code: "XXX" }],
    teams,
  );
  assert.deepEqual(unknown, ["XXX"]);
});

test("awards individual points and zeros DNS", () => {
  const { rows, unknownCodes } = toPublishRows("individual", extracted, teams);
  assert.deepEqual(unknownCodes, []);
  assert.equal(rows[0].points_awarded, 7);
  assert.equal(rows[1].points_awarded, 5);
  assert.equal(rows[2].points_awarded, 0);
  assert.equal(rows[2].result_status, "DNS");
});

test("replace rebuilds points from scratch instead of stacking", () => {
  const first = toPublishRows("individual", extracted, teams).rows;
  const revised: ReviewedResult[] = [
    { ...extracted[0], result_status: "DQ", achievement: "DQ" },
    extracted[1],
  ];
  const second = toPublishRows("individual", revised, teams).rows;
  const firstTotal = first.reduce((sum, row) => sum + row.points_awarded, 0);
  const secondTotal = second.reduce((sum, row) => sum + row.points_awarded, 0);
  assert.equal(firstTotal, 12);
  assert.equal(secondTotal, 5);
  assert.ok(secondTotal < firstTotal);
});

test("relay uses the relay table", () => {
  const { rows } = toPublishRows("relay", [extracted[0]], teams);
  assert.equal(rows[0].points_awarded, 10);
});
