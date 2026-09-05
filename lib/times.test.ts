import assert from "node:assert/strict";
import { test } from "node:test";
import { isFasterTime, parseSwimTimeMs } from "./times.ts";

test("parses minute and second swim times", () => {
  assert.equal(parseSwimTimeMs("02:08.03"), 2 * 60_000 + 8_000 + 30);
  assert.equal(parseSwimTimeMs("28.15"), 28_000 + 150);
  assert.equal(parseSwimTimeMs("1:02.45"), 62_000 + 450);
  assert.equal(parseSwimTimeMs("2.08.03"), parseSwimTimeMs("02:08.03"));
});

test("rejects codes and unreadable text", () => {
  assert.equal(parseSwimTimeMs("DNS"), null);
  assert.equal(parseSwimTimeMs("DQ"), null);
  assert.equal(parseSwimTimeMs("NMR"), null);
  assert.equal(parseSwimTimeMs("fast"), null);
  assert.equal(parseSwimTimeMs(""), null);
});

test("compares two legal times", () => {
  assert.equal(isFasterTime("02:08.03", "02:08.04"), true);
  assert.equal(isFasterTime("02:08.03", "02:08.03"), false);
  assert.equal(isFasterTime("DNS", "02:08.03"), null);
});
