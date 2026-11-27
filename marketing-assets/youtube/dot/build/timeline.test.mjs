import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTimeline, FILM_IDS, SHORT_IDS } from "./timeline.mjs";

const d = Object.fromEntries(FILM_IDS.map((id, i) => [id, 1 + i * 0.5]));
const opts = { lead: 2.5, gap: 1.2, endCard: 5, pauses: { l05: 1.5 } };

test("ids: film is l01..l12 and the Short is exactly lines 1, 3, 5, 7, 10, 12", () => {
  assert.deepEqual(FILM_IDS, ["l01","l02","l03","l04","l05","l06","l07","l08","l09","l10","l11","l12"]);
  assert.deepEqual(SHORT_IDS, ["l01","l03","l05","l07","l10","l12"]);
});

test("lines keep order, never overlap, and follow lead/gap/pauses", () => {
  const t = buildTimeline(d, FILM_IDS, opts);
  assert.deepEqual(t.items.map((i) => i.id), FILM_IDS);
  assert.equal(t.items[0].start, 2.5);
  for (let i = 0; i < t.items.length; i++) {
    const it = t.items[i];
    assert.ok(Math.abs(it.end - (it.start + d[it.id])) < 1e-9);
    if (i > 0) {
      const prev = t.items[i - 1];
      const want = prev.end + 1.2 + (opts.pauses[prev.id] || 0);
      assert.ok(Math.abs(it.start - want) < 1e-9, `${it.id} start`);
      assert.ok(it.start >= prev.end);
    }
  }
});

test("a long line stretches the timeline instead of overlapping", () => {
  const long = { ...d, l03: 30 };
  const t = buildTimeline(long, FILM_IDS, opts);
  const l03 = t.items.find((i) => i.id === "l03");
  const l04 = t.items.find((i) => i.id === "l04");
  assert.ok(l04.start >= l03.end + 1.2);
});

test("end card starts after the last line and total includes it", () => {
  const t = buildTimeline(d, SHORT_IDS, opts);
  const last = t.items[t.items.length - 1];
  assert.ok(t.endCardStart >= last.end);
  assert.equal(t.total, t.endCardStart + 5);
});

test("missing duration is an error, not a silent zero", () => {
  assert.throws(() => buildTimeline({ l01: 1 }, ["l01", "l02"], opts), /l02/);
});
