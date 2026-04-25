// Corpus-driven regression test for the prompt safety analyzer.
//
// Background (task #115): task #113 deliberately broadened the firewall's
// detection patterns toward false positives so casually-typed sensitive
// content (sk-fake1234, "my password is hello", "account number 12345",
// residential addresses, full names, etc.) actually triggered a warning.
// That was acceptable for a small beta but with millions of prompts in
// front of the firewall the noise becomes a complaint surface.
//
// This test pins the false-positive rate against a curated corpus of
// prompts that a human reviewer manually classified as containing zero
// secrets, PII, proprietary signals, or prompt-injection attempts. If a
// future pattern tweak causes one of these prompts to fire the warning
// panel, this test fails loudly and prints exactly which prompts
// regressed and which patterns matched, so the regression can be tuned
// (or the corpus entry re-evaluated) before merging.
//
// Threshold: < 1 % of corpus entries may trigger any issue. Empirically
// we currently sit at 0 %, and the threshold is intentionally tight so
// silent regressions are caught before they reach real users.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { analyzePromptSafety } from "../src/lib/dev/safety-source.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = join(__dirname, "fixtures", "safe-prompts.txt");
const MAX_FP_RATE = 0.01; // < 1 %

function loadCorpus() {
  const raw = readFileSync(CORPUS_PATH, "utf8");
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  return lines;
}

test("safe corpus is non-trivial in size", () => {
  const corpus = loadCorpus();
  // We need a meaningful sample to have any statistical confidence in the
  // FP-rate claim; trim-the-corpus-to-pass is not a valid fix.
  assert.ok(
    corpus.length >= 100,
    `expected at least 100 corpus prompts, got ${corpus.length}`,
  );
});

test("safety analyzer flags < 1% of the safe corpus as risky", () => {
  const corpus = loadCorpus();
  const falsePositives = [];

  for (const prompt of corpus) {
    const result = analyzePromptSafety(prompt);
    if (result.issues.length > 0) {
      falsePositives.push({
        prompt,
        level: result.level,
        riskScore: result.riskScore,
        issues: result.issues.map((i) => ({
          detail: i.detail,
          match: i.match,
          severity: i.severity,
          category: i.category,
        })),
      });
    }
  }

  const rate = falsePositives.length / corpus.length;
  if (rate >= MAX_FP_RATE) {
    const detail = falsePositives
      .map(
        (fp) =>
          `\n  PROMPT: ${fp.prompt}\n    level=${fp.level} score=${fp.riskScore}\n    issues:${fp.issues
            .map(
              (i) =>
                `\n      - [${i.severity}/${i.category}] ${i.detail} (matched: '${i.match}')`,
            )
            .join("")}`,
      )
      .join("");
    assert.fail(
      `Safety analyzer false-positive rate ${(rate * 100).toFixed(2)}% (${falsePositives.length}/${corpus.length}) exceeds threshold ${(MAX_FP_RATE * 100).toFixed(2)}%.\n` +
        `Either tighten the offending pattern with additional context requirements, or — only if the corpus entry is genuinely sensitive — remove the entry from safe-prompts.txt with a comment explaining why.\n` +
        `False positives:${detail}`,
    );
  }
});

test("clean prompt at the start of the corpus also scores 100/safe", () => {
  // Sanity check: at least the first prompt in the corpus should be
  // analyzed cleanly, otherwise something is structurally wrong with
  // the analyzer (not just an overly-broad pattern).
  const [first] = loadCorpus();
  const r = analyzePromptSafety(first);
  assert.equal(
    r.issues.length,
    0,
    `expected first corpus prompt '${first}' to have no issues, got: ${r.issues
      .map((i) => i.detail)
      .join(" | ")}`,
  );
  assert.equal(r.riskScore, 100);
  assert.equal(r.level, "safe");
});

test("scoring on a known-bad prompt still flags an issue (corpus is not silently disabling the analyzer)", () => {
  // Belt-and-braces guard: if someone accidentally short-circuits the
  // analyzer to always return zero issues (so the corpus test trivially
  // passes), this assertion catches that regression too.
  const r = analyzePromptSafety("my password is hunter2");
  assert.ok(r.issues.length >= 1, "analyzer must still flag a casual password disclosure");
  assert.notEqual(r.level, "safe");
});
