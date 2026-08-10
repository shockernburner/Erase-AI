---
name: Workflow port cleanup (api-server)
description: Why the api-server dev script frees its port via a Node script instead of lsof/fuser
---
Rule: in workflow run commands, do not rely on `fuser` or `lsof` to free a busy port — `fuser` is absent from the environment and `lsof` is not on the workflow's PATH (only on the interactive shell's replit-runtime-path), so shell kill-by-port silently no-ops and the server dies with EADDRINUSE on restart.

**Why:** the api-server workflow repeatedly failed to restart because an orphaned `node dist/index.mjs` survived SIGTERM and every shell-based port cleanup found nothing to kill.

**How to apply:** use `artifacts/api-server/scripts/free-port.mjs` (scans /proc cmdlines for the artifact's dist entrypoint, SIGTERM→SIGKILL, waits until the port actually binds). Same pattern for any other long-running artifact server that leaves orphans.
