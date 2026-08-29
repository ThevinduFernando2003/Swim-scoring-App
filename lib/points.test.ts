import assert from "node:assert/strict";
import { test } from "node:test";
import { POINTS, pointsFor } from "./points.ts";

test("individual points table", () => {
  assert.equal(pointsFor("individual", 1, "finished"), 7);
  assert.equal(pointsFor("individual", 2, "finished"), 5);
  assert.equal(pointsFor("individual", 3, "finished"), 4);
  assert.equal(pointsFor("individual", 4, "finished"), 3);
  assert.equal(pointsFor("individual", 5, "finished"), 2);
  assert.equal(pointsFor("individual", 6, "finished"), 1);
  assert.equal(POINTS.individual[1], 7);
});

test("relay points table is higher for 1st–3rd", () => {
  assert.equal(pointsFor("relay", 1, "finished"), 10);
  assert.equal(pointsFor("relay", 2, "finished"), 7);
  assert.equal(pointsFor("relay", 3, "finished"), 5);
  assert.equal(pointsFor("relay", 4, "finished"), 3);
});

test("only finished positions 1–6 score", () => {
  assert.equal(pointsFor("individual", 7, "finished"), 0);
  assert.equal(pointsFor("individual", 0, "finished"), 0);
  assert.equal(pointsFor("individual", null, "finished"), 0);
  assert.equal(pointsFor("relay", 1, "DNS"), 0);
  assert.equal(pointsFor("relay", 1, "DQ"), 0);
  assert.equal(pointsFor("individual", 2, "DNF"), 0);
  assert.equal(pointsFor("individual", 3, "NS"), 0);
  assert.equal(pointsFor("individual", 4, "WD"), 0);
});

test("DQ in a scoring place does not auto-shift points", () => {
  assert.equal(pointsFor("individual", 1, "DQ"), 0);
  assert.equal(pointsFor("individual", 2, "finished"), 5);
});
