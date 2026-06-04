---
name: i18n locale parity (eraseai)
description: All eraseai locale files must be key-for-key parity with en.json; the task-completion code-review gate enforces it even for unused keys.
---

# i18n locale parity vs en.json

Every file in `artifacts/eraseai/src/i18n/locales/` must have the **exact same
set of key paths** as `en.json` — no missing keys, no extra keys.

**Why:** A merge once landed where the non-English locales (de/es/fr/ja/zh) had a
`pipeline.*` namespace moved/renamed to `home.*` while `en.json` kept `pipeline.*`.
The keys were unused by the (now hardcoded) landing page, so it looked harmless —
but the task-completion code-review gate REJECTED completion purely on locale
divergence vs `en.json`. Reasoning "they're dead keys" does not pass the gate.

**How to apply:** After any merge or locale edit, run a parity check (build a Set
of dotted key paths per file and diff against `en.json`). To repair, rebuild each
locale from `en.json`'s structure, keeping the locale's value wherever the path
exists and falling back to `en` otherwise; recover renamed translations (e.g. pull
`home.analyze` into `pipeline.analyze`) before dropping the stray keys. Then re-run
`tsc --noEmit` (eraseai) and `pnpm --filter @workspace/api-server run test`.
