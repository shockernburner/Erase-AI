---
name: slides artifact wouter catalog entry
description: New slides artifacts fail pnpm install because the scaffold pins wouter to catalog: but the workspace catalog may lack it.
---

# Slides scaffold needs `wouter` in the pnpm catalog

When `createArtifact({ artifactType: "slides", ... })` scaffolds a new deck, its
`package.json` pins `"wouter": "catalog:"` (the slides router lives on wouter per the
workspace export contract). If `pnpm-workspace.yaml` has no `wouter` entry under
`catalog:`, `pnpm install` aborts with
`ERR_PNPM_CATALOG_ENTRY_NOT_FOUND_FOR_SPEC No catalog entry 'wouter' was found`.

**Why:** the catalog is shared across the monorepo; older slides artifacts (e.g.
`pitch-deck`) used `react-router-dom` with an explicit version, so wouter was never
added to the catalog even though the newer scaffold expects it.

**How to apply:** before installing a freshly scaffolded slides artifact, add
`wouter: ^<version>` to the `catalog:` block in `pnpm-workspace.yaml`. The version is
usually already resolved in `pnpm-lock.yaml` (grep `wouter@`) from another artifact —
reuse it to avoid a fresh resolution. Then `pnpm install` succeeds.
