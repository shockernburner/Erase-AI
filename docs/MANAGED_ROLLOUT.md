# Managed rollout (for an organization's IT team)

EraseAI can be installed on every company Chrome browser and Android phone
without anyone pasting an API key or clicking an invite link. People whose work
email is on the organization's domains join it automatically and take a seat.

## 1. In EraseAI (owner or admin)

Organization page → **Managed rollout**:

1. Enter the work email domains (e.g. `company.com`) and save.
2. Click **Make enrollment token**. Copy the token and the policy shown; the
   token is only shown once. Making a new token turns the old one off for new
   devices; people already set up stay protected. **Turn off** stops new
   enrollments.

## 2. Chrome

**Google Admin:** Devices → Chrome → Apps & extensions → Users & browsers →
add the Chrome Web Store app `hckhbadbpkihjpooeljdocgidelcampp`, set it to
**Force install**, and paste under **Policy for extensions**:

```json
{ "enrollmentToken": { "Value": "eae_…" } }
```

Optionally add `"userEmail": { "Value": "person@company.com" }`; otherwise
the extension popup asks each person for their work email once.

**Microsoft Intune / Windows Group Policy:** force-install the same extension
ID (ExtensionInstallForcelist) and set its policy (3rdparty → extensions →
the ID → `enrollmentToken`, optionally `userEmail`).

Schema: `extension/managed_schema.json`. Needs extension 1.6.0 or later.

## 3. Android (managed Google Play or any EMM)

Approve `com.eraseai.firewall` and set managed configuration
`enrollment_token` (and optionally `user_email` to pre-fill sign-in). People
sign in once with their work email and join. *(Ships with the next Android
release; see the Play publish checklist.)*

## How it's secured

- Only the sha256 of the token is stored. A device holding the token can only
  enroll emails on the organization's domains, and only while seats are free.
- A browser enrolled by token gets a **managed key** that can run firewall
  checks only (analyze, sanitize, report what happened). It can't read anyone's
  history or use the `/v1` API, so a leaked token can at worst add checks under
  a colleague's name.
- On Android the person signs in first (their email is proven), then joins.
- Removing someone on the Organization page drops them to their own plan at
  once, including on managed browsers.

API: `GET/PUT/POST/DELETE /api/org/deployment…` (owners/admins),
`POST /api/org/enroll` (devices). Rules: `artifacts/api-server/src/lib/org/enroll-source.mjs`.
