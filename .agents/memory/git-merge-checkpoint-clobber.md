---
name: Git merge + auto-checkpoint clobber
description: Why a main-agent-guided git merge loops forever, and the atomic-script workaround.
---

When git writes must happen but the main agent is blocked (see git-main-agent-guard.md) and the work can't be routed to a task agent, the fallback is to have the USER run git in their own shell while the agent resolves conflicts via file edits. This has a sharp trap.

**Problem:** The platform creates an auto-checkpoint commit at "Loop ended" (end of an agent turn). If a `git merge` is left in-progress (conflicts resolved in the working tree but not yet committed) across that turn boundary, the checkpoint commits the working tree as a PLAIN commit and discards `MERGE_HEAD`. Result: `origin/main` never becomes a parent, the push is rejected non-fast-forward, and a fresh `git merge origin/main` reproduces the EXACT same conflicts (merge-base falls back to the old common ancestor). This loops indefinitely.

**Symptom:** Same conflict set recurs every round; `git merge-base HEAD MERGE_HEAD` keeps returning the original ancestor instead of the teammate's last-merged commit; push fails non-ff even right after a "successful" commit.

**Fix — never leave an in-progress merge across a turn boundary.** The agent pre-stages the fully-resolved file contents to `/tmp` (after verifying typecheck/tests green), then writes ONE self-contained shell script the user runs in a single invocation: `git merge --abort` (clear stale state) → `git fetch` → `git merge --no-ff --no-commit origin/main` → copy resolved files from `/tmp` over the conflicted ones → `git checkout MERGE_HEAD -- <binary/rename-delete paths>` → guard-check for leftover `^<<<<<<< ` markers and `git ls-files -u` → `git commit --no-edit` → `git push`. Because merge+resolve+commit+push all happen inside one user shell run, no checkpoint can interrupt mid-merge. If push is rejected because origin moved again, re-running the same script self-heals.

**Why:** main agent can't run git at all, so the commit must be the user's; the only way to keep `MERGE_HEAD` alive is to never span a turn boundary while a merge is open.
