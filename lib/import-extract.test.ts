import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseImportedEvents,
  parseImportedSwimmers,
  parseImportedTeams,
} from "./import-extract.ts";

test("parses team list and uppercases codes", () => {
  const teams = parseImportedTeams({
    teams: [
      { code: "col", name: "University of Colombo" },
      { code: "COL", name: "duplicate skipped" },
      { code: "", name: "ignored" },
    ],
  });
  assert.equal(teams.length, 1);
  assert.equal(teams[0].code, "COL");
});

test("parses roster rows with optional age and SLASU number", () => {
  const swimmers = parseImportedSwimmers({
    swimmers: [
      {
        name: "C. D. Ampavila",
        team_code: "col",
        gender: "Men",
        age: 21,
        age_group: "Open",
        slasu_number: "SL123",
      },
      { name: "", team_code: "COL" },
    ],
  });
  assert.equal(swimmers.length, 1);
  assert.equal(swimmers[0].team_code, "COL");
  assert.equal(swimmers[0].age, 21);
  assert.equal(swimmers[0].slasu_number, "SL123");
});

test("parses schedule and marks relays from the name", () => {
  const events = parseImportedEvents({
    events: [
      { day: 1, event_number: 5, name: "200m Freestyle", gender: "Men" },
      { day: 2, event_number: 28, name: "4x100m Freestyle Relay", gender: "Women" },
    ],
  });
  assert.equal(events[0].event_type, "individual");
  assert.equal(events[1].event_type, "relay");
  assert.equal(events[1].gender, "Women");
});
