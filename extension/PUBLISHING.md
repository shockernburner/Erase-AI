# Publishing the EraseAI Firewall extension

This document is the operational checklist the team follows to ship a new
release of the **EraseAI Firewall** browser extension to the public stores
(Chrome Web Store, Microsoft Edge Add-ons, and Firefox AMO). It is paired
with the in-product install page (`artifacts/eraseai/src/pages/FirewallDocs.tsx`),
which links to the published listings.

The extension itself lives in `/extension`. Source of truth for icons, name,
description, and version is `extension/manifest.json`. Manual-install zip and
store-upload zip are produced by `artifacts/api-server/build.mjs`.

### Dev vs production builds

The checked-in `/extension` folder is the **development** build. Engineers can
"Load unpacked" against it and the popup will accept any `*.replit.app` host as
a custom API URL — handy for pointing at staging deployments.

`pnpm --filter @workspace/api-server run build` produces the **production**
zips. As part of packing, the build script:

- Replaces `extension/src/build-config.js` with a hardened version whose
  `allowedApiHosts` list only contains `eraseai.ai` and `*.eraseai.ai`. The
  service worker silently ignores any stored custom API URL that doesn't match
  this list.
- Strips `https://*.replit.app/*` from `manifest.json`'s `host_permissions`
  so the production extension cannot fetch arbitrary Replit deployments even
  if a user manages to get a `*.replit.app` URL into storage.
- Leaves the popup's "Custom API URL" input visible but shows a clear,
  production-specific error if the user types anything outside the allowlist.

If you add a new permanent staging hostname, update `PRODUCTION_ALLOWED_HOSTS`
**and** `PRODUCTION_API_HOST_PERMISSIONS` in `artifacts/api-server/build.mjs`
together — the popup-side allowlist and the manifest-side host_permissions
must agree or the API call will be blocked by the browser.

---

## 1. Cut a release

1. Bump the `version` in `extension/manifest.json`. Use `MAJOR.MINOR.PATCH`.
   Stores reject any upload with a version `<=` the previous release.
2. Smoke-test the change in Chrome via "Load unpacked" against `/extension`.
3. Build the release artifacts:

   ```sh
   pnpm --filter @workspace/api-server run build
   ```

   This produces two files in `artifacts/api-server/dist/`:

   - `eraseai-firewall.zip` — wraps everything in `/extension/`.
     Served by `GET /api/extension/download`. This is the **manual-install**
     zip — users unzip it and select the `extension/` folder via
     "Load unpacked". Do **not** upload this file to a store.
   - `eraseai-firewall-store.zip` — flat layout with `manifest.json` at the
     zip root. **This is the file you upload to every store.**

4. Verify the store zip by extracting it locally and confirming `manifest.json`
   is at the root (not inside an `extension/` folder).

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
  sent to AI platforms." (matches `manifest.json` description).
- Permission justifications:
  - `storage` — store the user's API key and firewall on/off toggle locally.
  - `activeTab` — read text from the focused chat input on supported AI sites.
  - `host_permissions` (each AI host) — inject the content script that
    intercepts prompts before they leave the browser.
  - `host_permissions` (eraseai.ai, *.eraseai.ai, *.replit.app) — call the
    EraseAI analyze/sanitize API from the service worker.

**Release**

1. Open the Chrome Web Store Developer Dashboard.
2. New item (first release) or "Package" → "Upload new package" (subsequent
   releases).
3. Upload `eraseai-firewall-store.zip`.
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

1. Create a new extension; upload the same `eraseai-firewall-store.zip`.
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
4. Submit `eraseai-firewall-store.zip` (after the polyfill changes) via the
   "Submit a New Add-on" flow. Choose "On this site" for distribution.
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

## 6. Troubleshooting: HTTP 404 from the extension

**Symptom.** The popup reports `HTTP 404` when saving an API key, or the
"Open EraseAI dashboard" link opens `eraseai.replit.app` (and that page is
itself a 404).

**Cause.** An older install of the extension (pre-1.3.0) wrote
`apiUrl: "https://eraseai.replit.app"` into `chrome.storage.local`. The
1.3.0 production lockdown drops that URL on save, but if the extension was
never re-opened after upgrading, the stale value can still drive the
service worker for one boot. The 1.3.1 service worker auto-heals this:
when the stored URL fails to respond but `https://eraseai.ai/api/dev/ping`
succeeds, it removes the stale `apiUrl` from storage and the popup shows a
"Reset to the official EraseAI server → Continue" card.

**Manual unblock for users on 1.3.0 or older:**

1. In Chrome, open `chrome://extensions`, find **EraseAI Firewall**, click
   **Service worker**, then in the DevTools console run:

   ```js
   chrome.storage.local.remove(["apiUrl"]);
   ```

2. Re-open the extension popup. The diagnosis card will switch to
   "Connected" once the API key is verified against `eraseai.ai`.

**Operator side-fix (defense in depth).** The api-server unconditionally
308-redirects any incoming request whose `Host` header is
`eraseai.replit.app` (or any `*.eraseai.replit.app` subdomain) to the
same path on `eraseai.ai` (see `legacyHostRedirect` in
`artifacts/api-server/src/app.ts`, covered by
`artifacts/api-server/tests/legacy-host-redirect.test.mjs`). **This only
helps if the request actually arrives at our Express app.** If Replit's
edge does not route `eraseai.replit.app` to the production deployment, the
client never sees our middleware — they see Replit's generic 404 page.

### 6a. Make `eraseai.replit.app` reach the live deployment

Every published autoscale deployment in Replit gets one default
`<deployment-slug>.replit.app` subdomain assigned by the platform. For
legacy installs to keep working, that default subdomain on the live
EraseAI deployment **must resolve to either `eraseai.replit.app` or a
subdomain that 308-redirects there.** Pick one of these in the
**Publishing → Domains** panel of the api-server deployment:

1. **Preferred — claim the `eraseai` deployment slug.**
   - In the Replit dashboard, open the `api-server` autoscale deployment.
   - Settings → **Deployment name / slug** → set to `eraseai`. The
     platform will provision `https://eraseai.replit.app` automatically.
   - Re-publish so the routing takes effect.
   - This is the cheapest option because the in-app `legacyHostRedirect`
     middleware then handles the 308 to `eraseai.ai` itself — no extra
     DNS or external service needed.

2. **Alternative — add `eraseai.replit.app` as a custom domain alias.**
   - If the deployment slug is already taken or in use elsewhere, open
     **Publishing → Domains** and add `eraseai.replit.app` as an
     additional hostname pointing at the same deployment as `eraseai.ai`.
   - Replit may decline aliasing a `.replit.app` hostname owned by
     another deployment; if so, fall back to option 1 or 3.

3. **Last resort — external 308 from a redirector.**
   - Stand up a tiny redirector (Cloudflare Worker, Netlify `_redirects`,
     Vercel `vercel.json` rewrite, etc.) that listens on
     `eraseai.replit.app` (via a CNAME) and 308s every path to
     `https://eraseai.ai$REQUEST_URI`. Document the redirector's owner
     and renewal cadence here.

**Whichever path you choose, the goal is the same:** a request to
`https://eraseai.replit.app/<anything>` returns either `200` (same
deployment, in which case the in-app middleware then issues the 308) or a
direct `308` to `https://eraseai.ai/<anything>`. Never `404`.

### 6b. Verify after every deploy

Run these three curls from a machine outside the workspace (your laptop is
fine — do **not** run them from the Replit shell, because the shell has
internal routing that bypasses the public edge):

```sh
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  https://eraseai.replit.app/api/dev/ping
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  https://eraseai.replit.app/ai-firewall
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  https://eraseai.replit.app/
```

**Acceptable outputs** for each line:

- `200` (request reached our Express app on the same deployment as
  `eraseai.ai`; the response body should match the canonical host), **or**
- `308 https://eraseai.ai/<same-path>` (edge or in-app redirect kicked in).

**Unacceptable output:** `404` with no `redirect_url`, or any 5xx. That
means the legacy URL is dead again — go back to section 6a and re-attach
the routing before the next extension release ships.

---

## 7. Quick checklist

- [ ] Bump `extension/manifest.json` version
- [ ] `pnpm --filter @workspace/api-server run build`
- [ ] Verify `dist/eraseai-firewall-store.zip` has `manifest.json` at root
- [ ] Smoke-test "Load unpacked" against `/extension`
- [ ] Upload to Chrome Web Store dashboard, submit for review
- [ ] Upload to Edge Add-ons dashboard, submit for review
- [ ] (Firefox) requires polyfill work — see section 4
- [ ] When live: set `VITE_CHROME_STORE_URL` / `VITE_EDGE_STORE_URL` /
      `VITE_FIREFOX_ADDON_URL` on the eraseai web artifact and redeploy
- [ ] Run the three legacy-host curls from section 6b
      (`https://eraseai.replit.app/api/dev/ping`, `/ai-firewall`, `/`).
      Each must return `200` or a `308` to `eraseai.ai` — never `404`.
      If any returns `404`, re-attach the legacy hostname per section 6a
      before announcing the release.
