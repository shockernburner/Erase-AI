# Publishing the EraseAI Firewall extension

This document is the operational checklist the team follows to ship a new
release of the **EraseAI Firewall** browser extension to the public stores
(Chrome Web Store, Microsoft Edge Add-ons, and Firefox AMO). It is paired
with the in-product install page (`artifacts/eraseai/src/pages/FirewallDocs.tsx`),
which links to the published listings.

The extension itself lives in `/extension`. Source of truth for icons, name,
description, and version is `extension/manifest.json`. Manual-install zip and
store-upload zip are produced by `artifacts/api-server/build.mjs`.

The extension talks only to `https://eraseai.ai` — there is no user-settable
API URL and no environment-specific build. The same code in `/extension` is
what ships to every store.

---

## 0a. Where the per-minute rate-limit counters live (production)

The api-server enforces two per-minute burst limits — **60 req/min per
API key** and **30 req/min per IP on `/api/dev/ping`** — as the brake
that keeps a leaked Pro/Business key (or an unauthenticated attacker)
from running an infinite loop against our infra.

Both counters live in **Postgres**, in the `burst_limit_hits` table
(see `artifacts/api-server/src/lib/security/pg-burst-limiter.mjs` and the
startup migration in `artifacts/api-server/src/migrations.ts`). One row
per request, scoped by `(scope, bucket_key, hit_at)`; expired rows are
pruned in-line by every `hit()` call, so the table doesn't grow without
bound.

Why this matters operationally:

- **Counters survive restarts.** Before task #131 the buckets lived in
  `Map`s in the api-server process and were wiped on every deploy — a
  leaked key got a fresh 60-req/min budget every release. They no
  longer do.
- **Counters are shared across api-server instances.** When we scale
  the api-server horizontally (more than one container behind the
  load balancer), the per-key 60/min limit stays a real per-key
  60/min limit instead of `60 × N instances`.
- **Postgres outage = 503, not unlimited traffic.** The middleware
  intentionally fails-closed: if the limiter query errors, the request
  is rejected (the whole point of the brake is that it works under
  load).

The monthly per-plan quota (200 / 1,000 / 10,000 req/month) was already
backed by `api_usage` in Postgres, so it had this property all along.
Only the per-minute burst counters needed moving.

---

## 0. Pinned extension ID & private-key custody

The production extension ID is **pinned**, not store-assigned, so the API
server's CORS allow-list (which only honours `chrome-extension://<id>` for
the pinned ID) survives the Chrome Web Store upload and stays consistent
across local "Load unpacked" dev installs, Chrome Web Store, and Edge.

**Pinned extension ID:** `bhcdkolfchcihbiakkbkfpfpempgdgji`

This ID is derived from the public half of an RSA-2048 keypair. The public
half lives in the repo as the `key` field in
[`extension/manifest.json`](./manifest.json) and is also baked into the
api-server CORS allow-list at
[`artifacts/api-server/src/lib/security/cors-source.mjs`](../artifacts/api-server/src/lib/security/cors-source.mjs)
under `PINNED_EXTENSION_ID`. Both must always agree — if you ever change
the `key` field, you must also update `PINNED_EXTENSION_ID` in the same PR
or the production extension will start failing CORS preflights against its
own backend.

**Where the private key lives**

The matching `.pem` private key is **not** committed to git. It is
generated once and stored in two places out-of-band:

1. The team's shared password manager (1Password vault `Vantward / Eng`),
   under the entry **"EraseAI Firewall — extension signing key"**.
2. A printed paper copy in the locked office drawer, as a disaster-recovery
   backup if the vault is lost.

When this repo was first set up the private key was generated locally and
written to `.local/secrets/extension-signing-key.pem` (a path that is
gitignored via the `.local/` rule). That file is the one-time staging
location — **after generation it must be moved into the password manager
and deleted from disk.** If you find the file still sitting in `.local/`,
that is a bug: move it now.

**Regenerating the key (only if compromised)**

If the private key is ever leaked or lost:

```sh
# 1. Generate a new keypair.
openssl genrsa -out new-extension-signing-key.pem 2048
# 2. Extract the public-key DER and base64-encode it.
openssl rsa -in new-extension-signing-key.pem -pubout -outform DER \
  | base64 -w0 > new-extension-public-key.b64
# 3. Compute the new chrome-extension://<id>.
node -e '
  const crypto = require("crypto");
  const { execSync } = require("child_process");
  const der = execSync("openssl rsa -in new-extension-signing-key.pem -pubout -outform DER");
  const hash = crypto.createHash("sha256").update(der).digest("hex");
  const id = hash.substring(0, 32).split("").map(c =>
    String.fromCharCode("a".charCodeAt(0) + parseInt(c, 16))
  ).join("");
  console.log("new extension ID:", id);
'
```

Then:
- Replace the `key` field in `extension/manifest.json` with the new base64.
- Replace `PINNED_EXTENSION_ID` in
  `artifacts/api-server/src/lib/security/cors-source.mjs` with the new ID.
- Move the new `.pem` into the password manager + paper backup.
- Delete the local `.pem`.

**⚠️ Warning — ID changes after Chrome Web Store publish**

Once the extension is live in the Chrome Web Store, **changing the `key`
field changes the extension ID, which the Chrome Web Store treats as a
brand-new extension.** Existing users would not get the update; they would
have to install the new listing manually and the old listing would have to
be unpublished. Treat the keypair as permanent unless it is actually
compromised.

---

## 1. Cut a release

1. Bump the `version` in `extension/manifest.json`. Use `MAJOR.MINOR.PATCH`.
   Stores reject any upload with a version `<=` the previous release.
2. Add a matching entry at the top of `extension/CHANGELOG.json` so the public
   status page and `/api/extension/version` reflect the new release.
3. Smoke-test the change in Chrome via "Load unpacked" against `/extension`.
4. Build the release artifacts:

   ```sh
   pnpm --filter @workspace/api-server run build
   ```

   This produces two files in `artifacts/api-server/dist/`:

   - `eraseai-firewall-<version>.zip` — wraps everything in `/extension/`.
     Served by `GET /api/extension/download`. This is the **manual-install**
     zip — users unzip it and select the `extension/` folder via
     "Load unpacked". Do **not** upload this file to a store.
   - `eraseai-firewall-store-<version>.zip` — flat layout with `manifest.json`
     at the zip root. **This is the file you upload to every store.**

5. Verify the store zip by extracting it locally and confirming `manifest.json`
   is at the root (not inside an `extension/` folder) **and** that it has
   no `key` field (see § 1a below).

---

## 1a. Why the store zip must not contain `manifest.key`

The Chrome Web Store rejects any upload whose `manifest.json` carries a
`key` field with the error **"key field is not allowed in manifest"**.
Edge Add-ons and Firefox AMO behave the same way.

Our source `manifest.json` deliberately keeps `key` so the unpacked dev
install always resolves to the pinned extension ID
(`bhcdkolfchcihbiakkbkfpfpempgdgji`) and the api-server CORS allow-list
keeps working in dev (see § 0). The build pipeline therefore strips the
`key` field from the **store-upload zip only**:

| Zip | Layout | `manifest.key` | Purpose |
| --- | --- | --- | --- |
| `eraseai-firewall-<v>.zip` | `extension/` folder | **kept** | Manual install via "Load unpacked"; pinned dev ID |
| `eraseai-firewall-store-<v>.zip` | flat (manifest at root) | **stripped** | Upload to Chrome Web Store / Edge Add-ons / Firefox AMO |

This stripping happens automatically inside `packExtensionZip` in
`artifacts/api-server/build.mjs`. The build also re-parses the rewritten
`manifest.json` and aborts loudly if `key` is somehow still present
(`store zip manifest.json still contains a "key" field — Chrome Web
Store will reject the upload. Aborting.`), so a future refactor can't
silently regress the contract. The `extension-store-zip` test in
`artifacts/api-server/tests/extension-store-zip.test.mjs` pins the
behaviour at CI time as well.

**Reminder:** never zip the `extension/` folder by hand for upload —
`zip -r foo.zip extension/` produces a working dev zip but a Web-Store-
rejecting upload zip. Always use `pnpm --filter @workspace/api-server run
build` and upload the `…-store-<v>.zip` it produces.

### After the first publish: allow-listing the published extension ID

The Chrome Web Store assigned the published extension
**`hckhbadbpkihjpooeljdocgidelcampp`**
(<https://chromewebstore.google.com/detail/eraseai-firewall/hckhbadbpkihjpooeljdocgidelcampp>).
It is **different** from the dev unpacked ID we pin via `key`, because the
store build strips `key`.

Store IDs are allow-listed in code, in `STORE_EXTENSION_IDS`
(`artifacts/api-server/src/lib/security/cors-source.mjs`) — add the Edge and
Firefox IDs there when those stores assign them. The listing URL is also
used by `extension/src/growth.js` (review link) and
`artifacts/eraseai/src/lib/extensionStore.ts` (site "Add to Chrome" links).

The `PUBLISHED_EXTENSION_IDS` environment variable
(`artifacts/api-server/src/middlewares/corsMiddleware.ts`) still works for
adding an ID without a code change:

```sh
# Comma-separated; supports the Edge and Firefox IDs too once those
# stores assign them.
PUBLISHED_EXTENSION_IDS=ohejlkkojlfajopmoeppdgnchpkjojfm,abcdefghijklmnopabcdefghijklmnop
```

Set this on the api-server's production environment after each store
goes live (Chrome → Edge → Firefox) and redeploy. The dev unpacked ID
stays in the allow-list automatically — no risk of orphaning local
development.

---

## 2. Chrome Web Store

**One-time setup**

- Register a publisher account at <https://chrome.google.com/webstore/devconsole>.
- Pay the one-time $5 USD developer fee.
- Use a Vantward-owned Google account; do **not** publish from a personal
  account. Add a backup account as group owner so the listing survives
  individual employee turnover.

**Listing assets** (gather once, reuse for every release)

- 128×128 icon (already in `extension/icons/icon128.png`).
- Small promo tile: 440×280 PNG/JPEG.
- (Optional) Marquee promo: 1400×560 PNG/JPEG.
- 1280×800 (preferred) or 640×400 screenshots — at least one, up to five.
- Detailed description (≤16,000 chars). Reuse the copy from
  `firewallDocs.overviewDesc` and the "How it works" steps.
- Privacy policy URL: <https://eraseai.ai/privacy>.
- Single-purpose statement: "Analyze prompts for privacy risks before they are
  sent to AI platforms." Keep this wording stable across releases; the
  listing title, summary and description live in
  [`STORE_LISTING.md`](./STORE_LISTING.md).
- Permission justifications:
  - `storage` — store the user's API key and firewall on/off toggle locally.
  - `activeTab` — read text from the focused chat input on supported AI sites.
  - `host_permissions` (each AI host) — inject the content script that
    intercepts prompts before they leave the browser.
  - `host_permissions` (eraseai.ai) — call the EraseAI analyze/sanitize API
    from the service worker.

**Release**

1. Open the Chrome Web Store Developer Dashboard.
2. New item (first release) or "Package" → "Upload new package" (subsequent
   releases).
3. Upload `eraseai-firewall-store-<version>.zip`.
4. Fill / confirm the listing fields, screenshots, privacy practices, and
   regional availability (worldwide is fine).
5. Submit for review. Initial review typically takes 1–7 business days; updates
   are usually under 24 hours.

**After it goes live**

- Copy the public listing URL (looks like
  `https://chromewebstore.google.com/detail/eraseai-firewall/<extension-id>`).
- Set `VITE_CHROME_STORE_URL` in the eraseai web artifact's environment
  (production secrets) to that URL. The install page automatically swaps
  the manual-install CTA for an "Add to Chrome" button when this is set.

---

## 3. Microsoft Edge Add-ons

**One-time setup**

- Sign up at <https://partner.microsoft.com/dashboard/microsoftedge>.
- No fee. Same upload package works (Chromium-based).

**Release**

1. Create a new extension; upload the same `eraseai-firewall-store-<version>.zip`.
2. Re-use the Chrome listing copy and screenshots.
3. Submit; review usually completes in 1–3 business days.

**After it goes live**

- Listing URL looks like
  `https://microsoftedge.microsoft.com/addons/detail/<id>`.
- Set `VITE_EDGE_STORE_URL` to that URL in the eraseai production env.

---

## 4. Firefox AMO (addons.mozilla.org)

Firefox does not support every Chrome MV3 API. The current extension uses the
`chrome.*` APIs without a polyfill, so the Firefox build needs an adapter
before it can be signed for permanent install. Until that work lands the
"Firefox" install path remains "Load Temporary Add-on" via `about:debugging`
(documented in the install page).

**When ready to ship to Firefox**

1. Add the [`webextension-polyfill`][polyfill] and rewrite content/background
   scripts to use `browser.*` instead of `chrome.*`.
2. In `manifest.json` add a `browser_specific_settings.gecko.id`
   (e.g. `firewall@eraseai.ai`).
3. Sign up at <https://addons.mozilla.org/developers/>.
4. Submit `eraseai-firewall-store-<version>.zip` (after the polyfill changes)
   via the "Submit a New Add-on" flow. Choose "On this site" for distribution.
5. Mozilla auto-signs and reviews. Updates ship the same way.

**After it goes live**

- Set `VITE_FIREFOX_ADDON_URL` to the AMO listing URL in the eraseai
  production env.

[polyfill]: https://github.com/mozilla/webextension-polyfill

---

## 5. Updating the in-product install page

The `Installation` section of the firewall docs (rendered by
`InstallSection` in `artifacts/eraseai/src/pages/FirewallDocs.tsx`) reads
three Vite env vars:

| Env var | Effect when set |
| --- | --- |
| `VITE_CHROME_STORE_URL` | Shows the primary "Add to Chrome" button. |
| `VITE_EDGE_STORE_URL` | Shows the "Add to Edge" button. |
| `VITE_FIREFOX_ADDON_URL` | Shows the "Add to Firefox" button. |

When none are set, the page shows a "Store listings are pending review"
notice and the manual-install flow remains available below the fold under
"Show manual install instructions".

Set the env vars on the eraseai web artifact in production after each store
listing goes live, then redeploy.

---

## 5a. What we scan in attachments (extension ≥ 1.3.5)

From version 1.3.5 the firewall scans **file attachments** dropped or
selected into the ChatGPT, Claude, and Gemini composers in addition to
the prompt text. The trigger is unchanged — Enter or Send click — so the
user-visible flow is the same; the surface area is just wider.

What gets scanned and how:

| Attachment kind | Behaviour |
| --- | --- |
| `.txt` `.md` `.csv` `.tsv` `.json` `.log` `.xml` `.html` `.htm` `.yaml` `.yml` `.sql` | **Extracted as plain text** via `FileReader.readAsText` and analysed alongside the prompt. Each piece is sent on its own port to the background analyzer; the worst level wins for the panel verdict. |
| `.pdf` | **Extracted via a sandboxed iframe** (`src/sandbox.html` + `src/sandbox-extractor.js`) using vendored Mozilla `pdf.js` 3.11.174 (`extension/vendor/pdfjs/`, Apache-2.0). Extracted text is analysed alongside the prompt, same per-piece "What we scanned" row as a CSV. The sandbox iframe runs under the manifest `sandbox.pages` CSP so `pdf.js` can use its worker; the host page communicates with it over a private `MessageChannel` per request. If the sandbox can't be reached, the PDF is unreadable, or the file is image-only, the row falls back to "couldn't read the PDF — review manually" with a Send Anyway override. |
| `.docx` | **Extracted via the same sandboxed iframe** using vendored `mammoth` 1.7.2 browser bundle (`extension/vendor/mammoth/`, BSD-2-Clause). Same per-piece treatment as PDF; same "couldn't read the Word document — review manually" fallback. |
| `.xlsx` | **Extracted via the same sandboxed iframe** with no vendored library — the iframe parses the XLSX as a ZIP itself (using the browser's `DecompressionStream("deflate-raw")` for compressed entries, available since Chrome 80) and pulls text from `<t>…</t>` elements inside `xl/sharedStrings.xml` and every `xl/worksheets/sheet*.xml`. Cell formulae and pure-numeric `<v>` values are intentionally not surfaced — only the strings users actually type into spreadsheets. Same per-piece treatment as PDF/DOCX; same "couldn't read the spreadsheet — review manually" fallback if the file is not a real XLSX (legacy `.xls`, password-protected, malformed) or extraction fails. Legacy `.xls` files are routed to the same path but always fall back. |
| `.pptx` | **Extracted via the same sandboxed iframe** with no vendored library — the iframe reuses the same minimal ZIP reader used for `.xlsx` and pulls text from DrawingML `<a:t>…</a:t>` runs inside every `ppt/slides/slide*.xml` and `ppt/notesSlides/notesSlide*.xml`. Slide bodies are emitted in deck order followed by speaker notes, so SSNs/emails hidden in notes are caught. Same per-piece treatment as PDF/DOCX/XLSX; same "couldn't read the slide deck — review manually" fallback if the file is not a real PPTX (legacy `.ppt`, password-protected, malformed) or extraction fails. Legacy `.ppt` files are routed to the same path but always fall back. |
| Images (`.png` `.jpg` `.jpeg` `.gif` `.webp`), archives (`.zip` `.gz` `.tar` `.7z` `.rar`) | Detected, panel surfaces a "skipped" row with the file name, override via Send Anyway. |
| Any other extension | Treated as unsupported — same skipped-row + Send Anyway treatment. |

Hard limits enforced client-side (extracted text never leaves the browser
beyond the analyze port, which runs against the user's own configured
endpoint):

- **5 MB** per file — anything larger is auto-blocked with "file too large".
- **15 MB** total across all attachments in a single send — same treatment.
- **50 KB** of extracted text per file — the rest is truncated and the
  panel says so.
- **8 KB** chunk size for analysis pieces; pieces above 10 KB are split.

Telemetry: the OUTCOME event sent back to the api-server now carries an
optional `pieces` summary (`{ promptPieces, filePieces, skippedFiles,
levels }`), counts only — **no file contents and no file names**. The
api-server clamps every field to 256 and rejects unrecognised shapes
silently (the outcome row is still written; `pieces` is just NULL). See
`artifacts/api-server/src/lib/dev/outcome-source.mjs` `normalisePieces`
for the full contract.

---

## 6. Quick checklist

- [ ] Bump `extension/manifest.json` version
- [ ] Confirm `manifest.json` `key` field still matches the pinned extension ID
      (`bhcdkolfchcihbiakkbkfpfpempgdgji`); never edit it casually (see § 0)
- [ ] Add a matching entry to `extension/CHANGELOG.json`
- [ ] `pnpm --filter @workspace/api-server run build`
- [ ] Verify `dist/eraseai-firewall-store-<version>.zip` has `manifest.json` at root **and** no `key` field (the build will already abort if `key` slipped through; this is just a final eyeball — see § 1a)
- [ ] Smoke-test "Load unpacked" against `/extension` and confirm Chrome
      assigns the pinned ID `bhcdkolfchcihbiakkbkfpfpempgdgji`
- [ ] Upload to Chrome Web Store dashboard, submit for review
- [ ] Upload to Edge Add-ons dashboard, submit for review
- [ ] (Firefox) requires polyfill work — see section 4
- [ ] When live: set `VITE_CHROME_STORE_URL` / `VITE_EDGE_STORE_URL` /
      `VITE_FIREFOX_ADDON_URL` on the eraseai web artifact and redeploy
