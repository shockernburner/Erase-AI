---
name: Post-pull build verification
description: Verification required after syncing remote commits that change packages or API server modules.
---

After pulling remote changes, reconcile dependencies from the committed lockfile and run the API's actual bundle build before treating passing tests or type-checks as sufficient.

**Why:** A remote update can add a dependency or create a runtime export mismatch that isolated tests do not load. The development workflow then fails even though narrower checks appear healthy.

**How to apply:** For API-affecting syncs, perform a frozen workspace install when manifests or the lockfile changed, then run build, dependency-aware type-check, tests, workflow restart, and a live health request.