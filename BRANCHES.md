# Branches

What each branch is for, so any session (or person) can pick up the work.
Update this file when a branch is created, merged or deleted.

| Branch | Purpose | Status | Merge when |
|---|---|---|---|
| `main` | Released code. Website deploys and store builds come from here. | — | — |
| `claude/bold-feynman-5rjicj` | Launch prep: device-aware install buttons on the home page, try-it-now extension welcome page, launch posts for 1.6.0 and Android, company outreach emails (`docs/marketing/prospect-outreach.md`). Also this file (now on `main` too; keep `main`'s copy if they conflict). | Draft PR open | Android app is in production (the home page's Android button opens the Play listing). First merge `main` into it: keep `main`'s new home page (and its Pro / Teams/Family plan names), re-adding the device-aware install buttons there. Deploy the website after merging. |
| `claude/kind-cerf-lx36pv` | SEO: every public page is prerendered at build time with its own title, description, canonical, structured data and full text (fixes Search Console's "Alternate page with proper canonical tag"); new `/learn` hub with nine AI data security guides (AI DLP, LLM data security, shadow AI, ChatGPT at work, PII redaction, prompt injection, AI policy template, GDPR/HIPAA/PCI, glossary); generated sitemap.xml and llms.txt; Learn links on the home page. | Merged into `main` (Oct 7, 2026) | Done; safe to delete. Deploy the website, check `/learn/shadow-ai` serves its own canonical, then resubmit the sitemap in Search Console. |

## Release order (agreed Oct 6, 2026)

1. Chrome Web Store approves 1.5.0 (built Oct 5; pending). Do **not** upload
   a new package while it is pending: that restarts the review. If it is
   still pending around Oct 12, contact Chrome Web Store support.
2. Upload 1.6.0 (already in `extension/` on `main`). Same day: Android 1.0.8
   to production. A first production release can't be staged, so it goes to
   100% (staged rollouts start with the next update).
3. 2–3 days later, if Android vitals are clean: merge
   `claude/bold-feynman-5rjicj` and deploy the website.
4. 1.6.0 approved: start the marketing push (launch gate and order in
   `docs/marketing/extension-launch-posts.md`) and company outreach (free
   30-day pilot for up to 10 people is approved).
