import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectRound,
  finalNameFromPrelim,
  qualifyFromResults,
} from "./qualify.ts";
import type { Team } from "./types.ts";

const teams: Team[] = [
  { id: 1, code: "COL", name: "Colombo" },
  { id: 2, code: "SAB", name: "Sabaragamuwa" },
];

function result(name: string, team_id: number, achievement: string) {
  return { swimmer_name: name, team_id, achievement, result_status: "finished" };
}

test("top 8 qualify and the next two are reserves", () => {
  const rows = Array.from({ length: 12 }, (_, i) =>
    result(`S${i + 1}`, 1, `28.${String(10 + i).padStart(2, "0")}`),
  );
  const list = qualifyFromResults(rows, teams, 8, 2);
  assert.equal(list.filter((row) => row.band === "qualified").length, 8);
  assert.equal(list.filter((row) => row.band === "reserve").length, 2);
  assert.equal(list[0].swimmer_name, "S1");
  assert.equal(list[8].band, "reserve");
  assert.equal(list[10].band, "out");
});

test("a tie for 8th takes every swimmer on that time into the final", () => {
  const rows = [
    ...Array.from({ length: 7 }, (_, i) => result(`A${i}`, 1, `27.${String(10 + i)}`)),
    result("Tie1", 1, "28.50"),
    result("Tie2", 2, "28.50"),
    result("Out", 1, "29.00"),
  ];
  const list = qualifyFromResults(rows, teams, 8, 2);
  assert.equal(list.filter((row) => row.band === "qualified").length, 9);
  assert.equal(list.find((row) => row.swimmer_name === "Out")?.band, "reserve");
});

test("detects prelims in the event name", () => {
  assert.equal(detectRound("100m Freestyle Prelims"), "prelim");
  assert.equal(detectRound("100m Freestyle Final"), "final");
  assert.equal(finalNameFromPrelim("100m Freestyle Prelims"), "100m Freestyle Final");
});
