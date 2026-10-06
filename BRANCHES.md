# Branches

What each branch is for, so any session (or person) can pick up the work.
Update this file when a branch is created, merged or deleted.

| Branch | Purpose | Status | Merge when |
|---|---|---|---|
| `main` | Released code. Website deploys and store builds come from here. | — | — |
| `main-m4f1pg` | Leftover copy of `main`, no extra commits. | Safe to delete | — |
| `claude/compassionate-feynman-yhk6x4` | AWS deploy: `docs/DEPLOY_CLOUD.md` fixes (Drizzle schema push on an empty database, pausing the AWS copy while idle). Docs only. | Draft PR open | Any time; docs only |
| `claude/bold-feynman-5rjicj` | Launch prep: device-aware install buttons on the home page, try-it-now extension welcome page, launch posts for 1.6.0 and Android, company outreach emails (`docs/marketing/prospect-outreach.md`). Also this file. | Draft PR open | Android app is in production (the home page's Android button opens the Play listing). Deploy the website after merging. |

## Release order (agreed Oct 6, 2026)

1. Chrome Web Store approves 1.5.0 (built Oct 5; pending). Do **not** upload
   a new package while it is pending: that restarts the review. If it is
   still pending around Oct 12, contact Chrome Web Store support.
2. Upload 1.6.0 (already in `extension/` on `main`). Same day: Android 1.0.8
   to production at 20%.
3. 2–3 days later, if Android vitals are clean: Android to 100%. Merge
   `claude/bold-feynman-5rjicj` and deploy the website.
4. 1.6.0 approved: start the marketing push (launch gate and order in
   `docs/marketing/extension-launch-posts.md`) and company outreach (free
   30-day pilot for up to 10 people is approved).
