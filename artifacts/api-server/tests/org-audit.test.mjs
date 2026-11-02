// The organization audit log: one row per firewall decision made by a member, without any message
// text (firewall_outcomes holds only level, action, score and categories). routes/org.ts runs these
// same pure helpers against the database.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  AUDIT_DEFAULT_DAYS,
  AUDIT_DEFAULT_LIMIT,
  AUDIT_MAX_LIMIT,
  actionLabel,
  auditCsv,
  parseAuditQuery,
  shapeAuditEvents,
} from "../src/lib/org/audit-source.mjs";

describe("parseAuditQuery", () => {
  test("defaults to the last 30 days, 100 rows, no filters", () => {
    assert.deepEqual(parseAuditQuery({}), { days: AUDIT_DEFAULT_DAYS, limit: AUDIT_DEFAULT_LIMIT, level: null, action: null, userId: null });
    assert.equal(AUDIT_DEFAULT_DAYS, 30);
    assert.equal(AUDIT_DEFAULT_LIMIT, 100);
  });

  test("keeps sane values and clamps the rest", () => {
    assert.equal(parseAuditQuery({ days: "7" }).days, 7);
    assert.equal(parseAuditQuery({ days: "0" }).days, 30);
    assert.equal(parseAuditQuery({ days: "366" }).days, 30);
    assert.equal(parseAuditQuery({ days: "abc" }).days, 30);
    assert.equal(parseAuditQuery({ limit: "25" }).limit, 25);
    assert.equal(parseAuditQuery({ limit: "100000" }).limit, AUDIT_MAX_LIMIT);
    assert.equal(parseAuditQuery({ limit: "-5" }).limit, 100);
  });

  test("only known levels and actions become filters", () => {
    assert.equal(parseAuditQuery({ level: "danger" }).level, "danger");
    assert.equal(parseAuditQuery({ level: "caution" }).level, "caution");
    assert.equal(parseAuditQuery({ level: "'; drop table x;--" }).level, null);
    assert.equal(parseAuditQuery({ action: "send-anyway" }).action, "send-anyway");
    assert.equal(parseAuditQuery({ action: "nope" }).action, null);
  });

  test("a person filter is a short plain id, nothing else", () => {
    assert.equal(parseAuditQuery({ userId: "u_123-abc" }).userId, "u_123-abc");
    assert.equal(parseAuditQuery({ userId: "x".repeat(200) }).userId, null);
    assert.equal(parseAuditQuery({ userId: "a b;c" }).userId, null);
  });

  test("tolerates non-object input", () => {
    assert.equal(parseAuditQuery(null).days, 30);
    assert.equal(parseAuditQuery(undefined).limit, 100);
  });
});

describe("actionLabel", () => {
  test("says what happened in plain words", () => {
    assert.equal(actionLabel("auto-send"), "Sent (all clear)");
    assert.equal(actionLabel("sanitize"), "Sanitized");
    assert.equal(actionLabel("cancel"), "Cancelled");
    assert.equal(actionLabel("send-anyway"), "Sent anyway");
  });
  test("an unknown action is shown as it is, not hidden", () => {
    assert.equal(actionLabel("weird"), "weird");
    assert.equal(actionLabel(null), "");
  });
});

describe("shapeAuditEvents", () => {
  const members = new Map([
    ["u1", { email: "ana@acme.com", name: "Ana Reyes" }],
    ["u2", { email: "bo@acme.com", name: null }],
  ]);
  const rows = [
    { id: 11, userId: "u1", level: "danger", action: "cancel", riskScore: 10, categories: '["secret_exposure","pii"]', createdAt: new Date("2026-11-03T08:15:00Z") },
    { id: 10, userId: "u2", level: "safe", action: "auto-send", riskScore: 100, categories: "[]", createdAt: "2026-11-03T08:10:00.000Z" },
  ];

  test("names the person, formats the time, and reads categories", () => {
    const out = shapeAuditEvents(rows, members);
    assert.equal(out.length, 2);
    assert.deepEqual(out[0], {
      id: 11,
      at: "2026-11-03T08:15:00.000Z",
      userId: "u1",
      email: "ana@acme.com",
      name: "Ana Reyes",
      level: "danger",
      action: "cancel",
      actionLabel: "Cancelled",
      riskScore: 10,
      categories: ["secret_exposure", "pii"],
    });
    assert.equal(out[1].name, null);
    assert.deepEqual(out[1].categories, []);
  });

  test("a bad categories value never breaks the log", () => {
    const out = shapeAuditEvents([{ ...rows[0], categories: "not json" }, { ...rows[0], id: 12, categories: '{"a":1}' }], members);
    assert.deepEqual(out[0].categories, []);
    assert.deepEqual(out[1].categories, []);
  });

  test("someone no longer in the organization is labelled, not dropped", () => {
    const out = shapeAuditEvents([{ ...rows[0], userId: "gone" }], members);
    assert.equal(out[0].email, "(former member)");
  });

  test("returns only the known fields: no message text can ride along", () => {
    const out = shapeAuditEvents([{ ...rows[0], text: "my secret prompt", prompt: "x", apiKeyId: "k" }], members);
    assert.deepEqual(Object.keys(out[0]).sort(), ["action", "actionLabel", "at", "categories", "email", "id", "level", "name", "riskScore", "userId"]);
  });

  test("ignores rows that are not objects", () => {
    assert.deepEqual(shapeAuditEvents([null, 5, undefined], members), []);
    assert.deepEqual(shapeAuditEvents(undefined, members), []);
  });
});

describe("auditCsv", () => {
  const events = [
    { id: 1, at: "2026-11-03T08:15:00.000Z", userId: "u1", email: "ana@acme.com", name: "Ana Reyes", level: "danger", action: "cancel", actionLabel: "Cancelled", riskScore: 10, categories: ["secret_exposure", "pii"] },
  ];

  test("has a header and one line per event, ending in a newline", () => {
    const csv = auditCsv(events);
    const lines = csv.split("\n");
    assert.equal(lines[0], "Time (UTC),Person,Email,Level,What happened,Risk score,Categories");
    assert.equal(lines[1], "2026-11-03T08:15:00.000Z,Ana Reyes,ana@acme.com,danger,Cancelled,10,secret_exposure; pii");
    assert.equal(lines[2], "");
  });

  test("an empty log is just the header", () => {
    assert.equal(auditCsv([]), "Time (UTC),Person,Email,Level,What happened,Risk score,Categories\n");
  });

  test("quotes cells with commas, quotes or line breaks", () => {
    const csv = auditCsv([{ ...events[0], name: 'Reyes, "Ana"\nJr' }]);
    assert.ok(csv.includes('"Reyes, ""Ana""\nJr"'));
  });

  test("a name or email that starts like a formula cannot run in a spreadsheet", () => {
    const csv = auditCsv([{ ...events[0], name: "=HYPERLINK(\"http://evil\",\"x\")", email: "+cmd@x.com" }, { ...events[0], name: "@SUM(1)", email: "-1@x.com" }]);
    assert.ok(!/(^|,)=HYPERLINK/m.test(csv));
    assert.ok(csv.includes("'=HYPERLINK"));
    assert.ok(csv.includes("'+cmd@x.com"));
    assert.ok(csv.includes("'@SUM(1)"));
    assert.ok(csv.includes("'-1@x.com"));
  });
});
