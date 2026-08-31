import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_POINTS_CONFIG,
  POINTS,
  parsePointsConfig,
  pointsFor,
  withMaxPlaces,
} from "./points.ts";

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

test("custom 8-place table awards 8th and ignores 9th", () => {
  const config = withMaxPlaces(
    {
      ...DEFAULT_POINTS_CONFIG,
      individual: { "1": 9, "2": 7, "3": 6, "4": 5, "5": 4, "6": 3, "7": 2, "8": 1 },
      relay: { "1": 18, "2": 14, "3": 12, "4": 10, "5": 8, "6": 6, "7": 4, "8": 2 },
    },
    8,
  );
  assert.equal(config.max_places, 8);
  assert.equal(pointsFor("individual", 8, "finished", config), 1);
  assert.equal(pointsFor("individual", 9, "finished", config), 0);
  assert.equal(pointsFor("relay", 1, "finished", config), 18);
});

test("parsePointsConfig fills missing places from the default table", () => {
  const parsed = parsePointsConfig({ max_places: 4, individual: { "1": 10 } });
  assert.equal(parsed.max_places, 4);
  assert.equal(parsed.individual["1"], 10);
  assert.equal(parsed.individual["2"], 5);
  assert.equal(parsed.relay["1"], 10);
});
