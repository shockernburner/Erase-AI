---
name: Republish "old app" = cache, not lost code
description: How to triage a user reporting that a republish deployed the old app, or that a merge lost their changes.
---

When a user says a republish "redeployed the old app" or that a merge lost their changes, verify before assuming loss or re-pulling anything.

**Triage order:**
1. Confirm where the supposed changes actually live. Replit Publish deploys from the **workspace**, not GitHub; and the workspace, `origin/main`, and the last "Published your App" commit are often content-identical. Run `git diff --stat HEAD origin/main` before doing any pull. (The user's shell must run `git fetch` first — main agent can't reach github.com.)
2. Prove whether a merge clobbered the user's work: find the user's own authored pre-merge commit (by author name / message, e.g. "Refocus public site…"), then `git diff --stat <that-commit> HEAD -- <the-files-they-changed>`. An **empty** diff on their key files means their work survived the merge intact.
3. If code is identical everywhere and the live site already shows the new version (screenshot the production URL), the "old app" is almost always a **browser/CDN cache** — have the user hard-refresh or use an incognito window. Do not republish or "recover" anything.

**Why:** main agent cannot reach github.com over the network and cannot run git writes, so it depends on the user's shell for `fetch` and on read-only local refs for analysis. Jumping straight to "recover lost work" or re-merging risks reintroducing conflicts that were already resolved, and republishing unchanged code fixes nothing.
