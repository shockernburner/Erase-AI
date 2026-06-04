---
name: stripe-replit-sync bundling + credentials
description: Why the Stripe schema migration silently no-ops under esbuild, plus the exact Replit connector credential shape.
---

# stripe-replit-sync must be esbuild-external

`stripe-replit-sync`'s `runMigrations()` ships its migration SQL files on disk and
locates them with `path.resolve(import.meta.url, "./migrations")`. When the
api-server bundles everything into one file via esbuild, `import.meta.url` points
at the bundle, the migrations dir is "not found", and `connectAndMigrate` **silently
returns without creating any tables** — yet `runMigrations` still resolves, so you
see "schema ready" logs while `stripe.accounts` / `stripe.prices` never exist.

**Why:** the lib reads files relative to its own module location; bundling destroys that path.
**How to apply:** keep `stripe-replit-sync` esbuild-external AND declare it (plus `stripe`) in the
artifact's own `package.json` (pnpm won't expose root-only deps to sub-packages, so externalizing
alone breaks runtime resolution). After boot, verify the `stripe.*` schema actually has its tables —
an empty schema with no tables is the signature of this silent failure.

# Replit Stripe connector credential shape (do not guess)

The connection proxy returns settings as `{ publishable, secret }` (NOT `secret_key`),
the request header is `X-Replit-Token` (NOT `X_REPLIT_TOKEN`), and the query must include
`environment=development|production` (derived from `REPLIT_DEPLOYMENT === "1"`). Wrong
field/header/env yields a 401 "connection not found". Match the blueprint snippet exactly.

# apiVersion literal tracks the pinned stripe types, not the blueprint string

The blueprint hardcodes `apiVersion: "2025-08-27.basil"`, but `stripe@20.0.0`'s
`LatestApiVersion` type is `"2025-11-17.clover"`, so the blueprint string is a TS error.
Use whatever literal the installed stripe types expect (the newer one); never downgrade.
