import assert from "node:assert/strict";
import { test } from "node:test";
import { applyNmrFlags, eventRecordKey, nextCurrentRecord } from "./records.ts";
import type { PublishRow } from "./types.ts";

const current = {
  event_key: "100m freestyle|Men|individual",
  event_name: "100m Freestyle",
  gender: "Men",
  event_type: "individual",
  time_text: "00:52.10",
  time_ms: 52_100,
  swimmer_name: "Old Holder",
  team_code: "COL",
  year: 2024,
};

function row(name: string, time: string, team_id = 1): PublishRow {
  return {
    position: 1,
    swimmer_name: name,
    team_id,
    achievement: time,
    result_status: "finished",
    points_awarded: 7,
  };
}

test("normalizes prelim and final names onto the same record key", () => {
  assert.equal(
    eventRecordKey("100m Freestyle Prelims", "Men", "individual"),
    eventRecordKey("100m Freestyle Final", "Men", "individual"),
  );
});

test("flags only times faster than the stored record as NMR", () => {
  const { rows, brokenBy } = applyNmrFlags(
    [row("New", "00:51.90"), row("Same", "00:52.10"), row("Slower", "00:53.00")],
    current,
  );
  assert.equal(rows[0].record_flag, "NMR");
  assert.equal(rows[1].record_flag, null);
  assert.equal(rows[2].record_flag, null);
  assert.equal(brokenBy.length, 1);
});

test("does not invent an NMR when no past record exists", () => {
  const { rows, brokenBy } = applyNmrFlags([row("New", "00:48.00")], null);
  assert.equal(rows[0].record_flag, null);
  assert.equal(brokenBy.length, 0);
});

test("the fastest breaker becomes the new current record", () => {
  const next = nextCurrentRecord(
    [row("A", "00:51.80"), row("B", "00:51.20")],
    { name: "100m Freestyle Final", gender: "Men", event_type: "individual" },
    new Map([[1, "SAB"]]),
    2026,
  );
  assert.equal(next?.swimmer_name, "B");
  assert.equal(next?.time_text, "00:51.20");
  assert.equal(next?.year, 2026);
});
