# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── eraseai/            # EraseAI React frontend (previewPath: /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

## EraseAI App

EraseAI is a demo-ready full-stack web app showcasing AI "machine unlearning." Dark-mode UI with cyan accent branding.

### Features

1. **Live Demo** — Upload dataset entries, preview/search dataset, erase entries from dataset, verify erasure with before/after comparison. Run Demo button orchestrates the full flow automatically.
2. **AI Dataset Unlearning Engine** — "Git for AI Training Data." Upload datasets (JSON/CSV/TXT), apply Delete or Redact operations (each creates a new immutable version), browse version history, view side-by-side Before/After diff (red=deleted, yellow=redacted), Data Impact panel with Forget Score metric, operation audit log, verify erasure with before/after match counts, download in 3 modes (clean/redacted/full). Includes "Run Full Demo" button that orchestrates an automated flow: load demo → scan for keyword → delete → verify erasure — with step-by-step progress labels.

### Key Files

- `lib/db/src/schema/eraseai.ts` — DB schema: `facts`, `logs`, `verify_snapshots`, `datasets`, `dataset_versions`, `dataset_rows`, `dataset_operations` tables
- `artifacts/api-server/src/routes/eraseai.ts` — Live Demo API routes (teach, ask, forget, verify, seed, logs)
- `artifacts/api-server/src/routes/datasets.ts` — Version-Controlled Dataset API routes (upload, demo, get, erase, download, verify)
- `artifacts/eraseai/src/pages/Home.tsx` — Main page with tab navigation (Live Demo | AI Dataset Unlearning Engine)
- `artifacts/eraseai/src/pages/DatasetSanitizer.tsx` — Version-Controlled Unlearning Engine UI
- `artifacts/eraseai/src/context/DemoContext.tsx` — Demo orchestration context

### Dataset API (Version-Controlled)

DB tables: `datasets` (id, name, original_format), `dataset_versions` (id, dataset_id, version_number, parent_version_id), `dataset_rows` (id, version_id, row_index, content, is_removed, is_redacted, removed_reason), `dataset_operations` (id, dataset_id, version_id, type, value, affected_rows_count).

- `GET /api/datasets/demo` — Create/reset demo dataset with 3 sample rows at version 1
- `POST /api/datasets/upload` — Upload file, creates version 1 with all rows
- `GET /api/datasets/:id?version=N&search=kw&limit=1000` — Get dataset with rows for specified (or latest) version, all versions list, and operation log
- `POST /api/datasets/:id/erase` — Body: `{ mode: "delete"|"redact", value: "keyword" }`. Creates new version with transformations, logs operation. Returns impact summary.
- `GET /api/datasets/:id/download?mode=clean|redacted|full&version=N` — Download dataset for specified version in 3 modes
- `POST /api/datasets/:id/verify` — Body: `{ query: "keyword" }`. Compares first version vs latest, returns matches_before/matches_after/status
