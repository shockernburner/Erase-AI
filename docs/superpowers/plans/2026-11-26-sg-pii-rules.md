# Singapore NRIC/FIN and Phone Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The analyzer and Sanitize catch Singapore NRIC/FIN and phone numbers, on the server and on-device in the extension.

**Architecture:** New entries in the existing pattern tables of `safety-source.mjs` (with a checksum/context validator) and `sanitize-source.mjs`; the extension's `local-scanner.js` is regenerated from those files.

**Tech Stack:** Plain ESM JavaScript, `node --test` (api-server), vitest (extension).

**Spec:** `docs/superpowers/specs/2026-11-26-sg-pii-rules-design.md`

## Global Constraints

- Category `pii`, severity `high`; detail strings: `"Singapore NRIC/FIN number found"`, `"Singapore phone number found"`.
- Phone words (case-insensitive): phone, mobile, hp, tel, call, whatsapp, contact. NRIC context words: NRIC, FIN, IC, identity.
- Sanitize tokens: `[NRIC_REDACTED]`, `[PHONE_REDACTED]`.
- Extension version `1.6.3`; changelog in `extension/CHANGELOG.json`, plain user wording.
- Never edit `extension/src/local-scanner.js` by hand.

## Review Focus

- Lowercase `s1234567d` with a valid check letter is flagged (people type lowercase) — Task 1 test.
- `+65-9123-4567` and `(+65) 9123 4567` are flagged — Task 1 test.
- A masked NRIC such as `SXXXX567D` is not flagged (already safe) — Task 1 test.
- An NRIC inside a longer token (`S1234567DX`, `ABS1234567D`) is not flagged — Task 1 test.
- After Sanitize, the text re-checks with no Singapore issues — Task 2 test.

---

### Task 1: Analyzer rules

**Files:** Modify `artifacts/api-server/src/lib/dev/safety-source.mjs` (helpers + `PII_PATTERNS`). Test: create `artifacts/api-server/tests/safety-sg.test.mjs`.

**Interfaces:** Produces two regexes reused by Task 2 in spirit (Task 2 has its own copies in `PII_REPLACEMENTS`). No new exports.

- [ ] **Step 1: Write failing tests** in `safety-sg.test.mjs`, using `analyzePromptSafety(text).issues` filtered by `detail`:
  - flagged NRIC: `"Client NRIC S1234567D"`, `"s1234567d"`, `"T0123456G"` is only expected if its letter is valid — compute expected letters with the algorithm below inside the test file rather than hard-coding unverified ones; `"F1234567N"`; `"FIN: G1234567X"` (context, any letter).
  - not flagged NRIC: `"S1234567A"` with no context word, `"SXXXX567D"`, `"S1234567DX"`, `"ABS1234567D"`.
  - flagged phone: `"+65 9123 4567"`, `"+6591234567"`, `"+65-9123-4567"`, `"(+65) 9123 4567"`, `"mobile: 9123 4567"`, `"call me at 81234567"`.
  - not flagged phone: `"order 91234567"`, `"invoice 81234567"`, `"+65 1234 5678"` (first digit not 3/6/8/9).
  - each flagged case has `level !== "safe"`.
- [ ] **Step 2: Run** `cd artifacts/api-server && node --test tests/safety-sg.test.mjs` — expected FAIL.
- [ ] **Step 3: Implement.** Add `nricChecksumValid(s: string): boolean` and a context check. Algorithm (S/T/F/G; M only via context):

  ```js
  // weights 2,7,6,5,4,3,2 over the 7 digits; +4 if prefix is T or G; r = sum % 11
  // S/T letter = "JZIHGFEDCBA"[r]; F/G letter = "XWUTRQPNMLK"[r]
  ```
  Pattern `/(?<![A-Za-z0-9])[STFGMstfgm]\d{7}[A-Za-z](?![A-Za-z0-9])/g`, validate = checksum on the uppercased match OR `/\b(?:nric|fin|ic|identity)\b/i` within 30 chars before.
  Phone patterns: `/(?<![\w+])\(?\+65\)?[\s-]?[3689]\d{3}[\s-]?\d{4}(?!\d)/g` and
  `/(?<=\b(?:phone|mobile|hp|tel|call(?:\s+me)?(?:\s+at|\s+on)?|whatsapp|contact)\b[^\d\n]{0,20})[3689]\d{3}[\s-]?\d{4}(?!\d)/gi`.
- [ ] **Step 4: Run** the new test and the full suite `cd artifacts/api-server && pnpm test` — expected PASS, including `safety.test.mjs` and `safety-corpus.test.mjs` unchanged.
- [ ] **Step 5: Commit** `feat(scanner): detect Singapore NRIC/FIN and phone numbers`.

### Task 2: Sanitize

**Files:** Modify `artifacts/api-server/src/lib/dev/sanitize-source.mjs` (`PII_REPLACEMENTS`). Test: add a `describe("sanitize, Singapore")` block to `tests/safety-sg.test.mjs`.

- [ ] **Step 1: Failing tests:** `sanitizeText("NRIC S1234567D, +65 9123 4567, mobile 8123 4567").sanitized` (check the actual return field name in the file) contains `[NRIC_REDACTED]` once and `[PHONE_REDACTED]` twice, keeps the word `mobile`, and `analyzePromptSafety(result)` has no issue with a Singapore detail.
- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement:** add the NRIC shape pattern (no checksum: redacting is harmless) and both phone patterns from Task 1 before the existing US phone entry.
- [ ] **Step 4: Run** `pnpm test` in `artifacts/api-server` — PASS.
- [ ] **Step 5: Commit** `feat(sanitize): redact Singapore NRIC/FIN and phone numbers`.

### Task 3: Extension on-device scanner and version

**Files:** Regenerate `extension/src/local-scanner.js`; modify `extension/manifest.json` (`version`), `extension/CHANGELOG.json` (new top entry); test: add samples to `CORPUS` in `extension/tests/local-scanner.test.js`.

- [ ] **Step 1:** Add `"NRIC S1234567D, call +65 9123 4567"` and `"order 91234567"` to `CORPUS` (the existing parity test compares local vs server).
- [ ] **Step 2: Run** `cd extension && npx vitest run tests/local-scanner.test.js` — expected FAIL (stale generated file).
- [ ] **Step 3:** `node scripts/src/build-extension-local-scanner.mjs`; set version `1.6.3`; changelog entry dated 2026-11-26: "Now catches Singapore NRIC/FIN numbers and Singapore phone numbers (+65, or 8 digits after a word like mobile or phone), and Sanitize replaces them".
- [ ] **Step 4: Run** the full extension suite (`npx vitest run` in `extension`, or the repo's configured command) — PASS, including `manifest.test.js` and `no-remote-code.test.js`.
- [ ] **Step 5: Commit** `extension 1.6.3: Singapore NRIC/FIN and phone checks on-device`.
