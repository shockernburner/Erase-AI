---
name: Git writes blocked in main agent
description: The Replit sandbox forbids ALL destructive git operations from the main agent, including lock-file removal.
---

The main agent's bash sandbox refuses every destructive `.git` write — not just
`git merge`/`commit`/`reset`, but even `rm -f .git/*.lock`. The error is:
"Destructive git operations are not allowed in the main agent. Use the
`project_tasks` skill to propose a new background Project Task that will perform
this git operation instead." This holds in Build mode too.

**Why:** Platform-level guard. There is no flag or workaround from the main
agent — read-only git (`git --no-optional-locks status/log/...`) works, writes do not.

**How to apply:** Any task whose core deliverable is a git operation (merge a
diverged remote, clear a stale `ORIG_HEAD.lock`/`index.lock`, push) cannot be
executed by the main agent. It must run as a background Project Task (isolated
task agent). Propose it from Plan mode via `project_tasks`. Do not keep retrying
the git command in Build mode — it will keep failing.
