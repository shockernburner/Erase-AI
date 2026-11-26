# Singapore NRIC/FIN and phone detection (short design)

Approved by the owner on 2026-11-26 ("I agree with A first").

## Why

Outreach now targets Singapore firms of 10–50 people (`docs/marketing/outreach-sg-2026-12.md`). A test on 2026-11-26
showed the scanner misses Singapore NRIC/FIN numbers and Singapore phone numbers, which is the data those firms
handle. A pilot would expose the gap in its first week.

## Goals

- Flag Singapore NRIC/FIN numbers (`S1234567D` shape) in the analyzer, with few false alarms.
- Flag Singapore phone numbers written with `+65`, or 8-digit numbers starting with 3, 6, 8 or 9 when a phone word
  (phone, mobile, hp, tel, call, whatsapp, contact) sits just before them.
- Sanitize & Send replaces both, so a sanitized message passes its own re-check.
- Same rules on-device in the extension (regenerated `local-scanner.js`).

## Non-goals

Bank account numbers, salaries, HKID, Malaysian IC, the Android app (its own `LocalRiskScanner.kt`; cannot be built
here, so it is left for a real Android build), and any change to prices or copy beyond the changelog.

## Approaches considered

1. **Checksum or context (chosen).** NRIC/FIN is flagged when its check letter is valid (S/T/F/G, the public
   ICA weights), or when a word like NRIC, FIN, IC or identity is nearby (covers M-series and typos). Phones
   need `+65` or a phone word. Few false alarms, catches real numbers.
2. Shape only (`[STFGM]\d{7}[A-Z]` always, any 8-digit number). Simple, but every 8-digit invoice or order number
   would be flagged.
3. An AI model. Not how the product works (rules-based by design), and slower.

## Design

- `artifacts/api-server/src/lib/dev/safety-source.mjs`: new entries in `PII_PATTERNS` (category `pii`, severity
  `high`) with a `validate` for the NRIC checksum or context.
- `artifacts/api-server/src/lib/dev/sanitize-source.mjs`: new `PII_REPLACEMENTS` entries `[NRIC_REDACTED]` and
  `[PHONE_REDACTED]` (phone words kept, only the digits replaced).
- Regenerate `extension/src/local-scanner.js` with `node scripts/src/build-extension-local-scanner.mjs`.
- Extension version 1.6.3 with a changelog entry. The owner uploads only when nothing is in Chrome review.

## Tests first

Valid NRIC/FIN with correct check letter flagged; wrong check letter with no context not flagged; with "NRIC"
nearby flagged; `+65 9123 4567`, `+6591234567`, `mobile: 9123 4567` flagged; `order 91234567` and
`invoice 81234567` not flagged; sanitize replaces each and the result re-checks as clean; extension local scanner
gives the same result as the server for the new samples.
