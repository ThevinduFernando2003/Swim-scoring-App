import assert from "node:assert/strict";
import { test } from "node:test";
import { rankStandings } from "./standings.ts";
import type { Team } from "./types.ts";

const teams: Team[] = [
  { id: 1, code: "COL", name: "University of Colombo" },
  { id: 2, code: "SAB", name: "Sabaragamuwa University of Sri Lanka" },
  { id: 3, code: "KEL", name: "University of Kelaniya" },
];

test("ranks by points then count-back of 1sts, 2nds, ...", () => {
  const ranked = rankStandings(teams, [
    { team_id: 1, position: 1, result_status: "finished", points_awarded: 7 },
    { team_id: 2, position: 1, result_status: "finished", points_awarded: 7 },
    { team_id: 2, position: 3, result_status: "finished", points_awarded: 4 },
    { team_id: 3, position: 2, result_status: "finished", points_awarded: 5 },
  ]);

  assert.equal(ranked[0].code, "SAB");
  assert.equal(ranked[0].points, 11);
  assert.equal(ranked[1].code, "COL");
  assert.equal(ranked[1].points, 7);
  assert.equal(ranked[2].code, "KEL");
});

test("tied points break on more first-place finishes", () => {
  const ranked = rankStandings(teams, [
    { team_id: 1, position: 1, result_status: "finished", points_awarded: 7 },
    { team_id: 2, position: 2, result_status: "finished", points_awarded: 5 },
    { team_id: 2, position: 4, result_status: "finished", points_awarded: 2 },
  ]);

  assert.equal(ranked[0].points, ranked[1].points);
  assert.equal(ranked[0].code, "COL");
  assert.equal(ranked[0].placeCounts[0], 1);
  assert.equal(ranked[1].code, "SAB");
});

test("teams with no results still appear at 0 points", () => {
  const ranked = rankStandings(teams, []);
  assert.equal(ranked.length, 3);
  assert.ok(ranked.every((row) => row.points === 0));
});
