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
2. **AI Dataset Unlearning Engine** — "Git for AI Training Data." Upload datasets (JSON/CSV/TXT), apply Delete or Redact operations (each creates a new immutable version), browse version history, view side-by-side Before/After diff (red=deleted, yellow=redacted), Data Impact panel with Forget Score metric, operation audit log, verify erasure with before/after match counts, download in 3 modes (clean/redacted/full). Includes "Run Full Demo" button that orchestrates an automated flow: load demo → analyze → auto-fix → erase → verify — with step-by-step progress labels.
3. **Dataset Intelligence Engine** — Automated dataset analysis detecting PII (emails, phone numbers), biased language (gender/racial), toxic content, duplicate rows, and low-quality entries. Interactive analysis results panel with category summary cards, expandable flagged row lists, per-category "Fix" buttons, and "Apply All Fixes" batch action. Auto-fix creates a new immutable version with deletions and redactions applied. **Dataset Profiling** (POST /api/datasets/:id/profile): PapaParse-based CSV parsing with auto-delimiter detection (comma, semicolon, tab, pipe), per-column profiling (type detection: numeric/categorical/text/datetime/boolean/empty), missing %, cardinality, numeric stats (min/max/mean/median/stdDev/skewness), categorical top-N values, column-aware bias detection (proxy bias for protected attributes, class imbalance, skewed distributions, underrepresented groups), and ML recommendations with code snippets.
4. **ML Feedback Engine** — Rule-based ML pipeline recommendations that map detected issues to actionable preprocessing, training, and evaluation suggestions. Auto-generates after analysis. Recommendations include code snippets, priority levels (critical/high/medium/low), and are filterable by category. Export as Markdown or JSON.
5. **Authentication (Email/Password + Social)** — Email/password signup/login with bcrypt password hashing. Google OAuth and Apple Sign-In social login support. Session-based auth with httpOnly cookies, 7-day TTL. Login page with Log In/Sign Up toggle, email/password form, and Google/Apple social login buttons. User avatar/menu in header with profile info and logout. All dataset API endpoints require authentication (401 for unauthenticated). Datasets scoped by userId. Admin auto-seeded for `firdous.mahmood26@gmail.com` with role=admin, planType=enterprise. DB tables: `users` (id, email, first_name, last_name, profile_image_url, password_hash, auth_provider, role, plan_type, subscription_id, subscription_status, plan_start_date, plan_end_date, created_at, updated_at), `sessions` (sid, sess, expire). Auth provider endpoints: POST /auth/signup, POST /auth/login, GET /auth/google, GET /auth/google/callback, GET /auth/apple, POST /auth/apple/callback, GET /auth/providers, POST /auth/logout.
6. **Payments & Access Control (Airwallex)** — Three-tier pricing: Free ($0, 100 row limit, no ML feedback), Pro ($49/mo, unlimited rows + ML feedback), Enterprise (custom pricing, contact sales at director@futureonward.com / WhatsApp +852 9057 6851). Real Airwallex Payment Intent integration: POST /billing/checkout creates a Payment Intent via Airwallex API and returns an HPP checkout URL. Frontend redirects to Airwallex hosted checkout page. After payment, user returns to CheckoutSuccess page which polls /billing/plan to confirm upgrade. Webhook endpoint receives real Airwallex events (payment_intent.succeeded, payment_intent.payment_failed) with HMAC-SHA256 signature verification. GET /billing/checkout-status polls intent status as fallback. Cancellation is DB-only (Airwallex uses one-time payment intents, not subscriptions). Environment secrets: AIRWALLEX_API_KEY, AIRWALLEX_CLIENT_ID, AIRWALLEX_WEBHOOK_SECRET. API client with OAuth2 token caching in `artifacts/api-server/src/lib/airwallex.ts`. Plan badge (FREE/PRO/ENTERPRISE) shown in UserMenu. Upgrade prompts appear in DatasetSanitizer when free users hit row limits or try ML feedback (403 with `upgrade: true`). `requirePro()` middleware gates ML feedback endpoints.

### Key Files

- `lib/db/src/schema/eraseai.ts` — DB schema: `facts`, `logs`, `verify_snapshots`, `datasets` (with userId FK), `dataset_versions`, `dataset_rows`, `dataset_operations`, `analysis_results` tables
- `lib/db/src/schema/auth.ts` — Auth DB schema: `users`, `sessions` tables (required for Replit Auth)
- `artifacts/api-server/src/routes/eraseai.ts` — Live Demo API routes (teach, ask, forget, verify, seed, logs)
- `artifacts/api-server/src/routes/datasets.ts` — Version-Controlled Dataset API routes (upload, demo, get, erase, download, verify, analyze, apply-suggestions) — all require auth
- `artifacts/api-server/src/routes/auth.ts` — Auth routes (signup, login, Google OAuth, Apple Sign-In, logout, user, providers)
- `artifacts/api-server/src/middlewares/authMiddleware.ts` — Auth middleware (session validation from cookie/bearer token)
- `artifacts/api-server/src/lib/auth.ts` — Auth utilities (session CRUD, cookie helpers)
- `lib/replit-auth-web/` — Browser auth package with `useAuth()` hook
- `artifacts/api-server/src/lib/airwallex.ts` — Airwallex API client (OAuth2 token caching, Payment Intent creation/retrieval)
- `artifacts/api-server/src/routes/billing.ts` — Billing/payments routes (plan check, pricing, checkout, checkout-status, cancel, webhook)
- `artifacts/eraseai/src/pages/CheckoutSuccess.tsx` — Post-payment confirmation page with plan polling
- `artifacts/eraseai/src/pages/Home.tsx` — Main page with tab navigation (Live Demo | AI Dataset Unlearning Engine)
- `artifacts/eraseai/src/pages/DatasetSanitizer.tsx` — Version-Controlled Unlearning Engine UI with upgrade prompts
- `artifacts/eraseai/src/pages/PricingPage.tsx` — Pricing page with 3-tier comparison
- `artifacts/eraseai/src/components/UpgradePrompt.tsx` — Reusable upgrade prompt components
- `artifacts/eraseai/src/context/DemoContext.tsx` — Demo orchestration context

### Dataset API (Version-Controlled)

DB tables: `datasets` (id, name, original_format, user_id), `dataset_versions` (id, dataset_id, version_number, parent_version_id), `dataset_rows` (id, version_id, row_index, content, is_removed, is_redacted, removed_reason), `dataset_operations` (id, dataset_id, version_id, type, value, affected_rows_count). All dataset API endpoints require authentication — unauthenticated requests receive 401. Datasets are scoped by user_id.

- `GET /api/datasets/demo` — Create/reset demo dataset with 8 sample rows at version 1 (includes PII, bias, toxic, duplicate entries for analysis demo)
- `POST /api/datasets/upload` — Upload file, creates version 1 with all rows
- `GET /api/datasets/:id?version=N&search=kw&limit=1000` — Get dataset with rows for specified (or latest) version, all versions list, and operation log
- `POST /api/datasets/:id/erase` — Body: `{ mode: "delete"|"redact", value: "keyword" }`. Creates new version with transformations, logs operation. Returns impact summary.
- `GET /api/datasets/:id/download?mode=clean|redacted|full&version=N` — Download dataset for specified version in 3 modes
- `POST /api/datasets/:id/verify` — Body: `{ query: "keyword" }`. Compares first version vs latest, returns matches_before/matches_after/status
- `POST /api/datasets/:id/analyze` — Rule-based analysis detecting PII (email/phone), biased language (gender/racial), toxic content, duplicates, and low-quality entries. Persists results to `analysis_results` table. Returns summary + detailed issues.
- `POST /api/datasets/:id/apply-suggestions` — Body: `{ issue_types: ["pii","bias","toxic","duplicate","quality"] }`. Applies auto-fix (delete/redact) based on stored analysis results, creates new version. Returns impact summary.
- `POST /api/datasets/:id/ml-feedback` — Generates ML pipeline recommendations based on stored analysis results. Rule-based mapping from issue types to preprocessing/training/evaluation recommendations with priority levels and code snippets.
- `GET /api/datasets/:id/ml-feedback/export?format=md|json` — Export ML recommendations as Markdown or JSON for download.
- `POST /api/datasets/:id/profile` — Column-aware dataset profiling for CSV data. Auto-detects delimiter, profiles each column (type, missing%, cardinality, numeric stats, categorical top-N), detects bias issues (proxy bias, class imbalance, skew, underrepresentation), and generates ML recommendations. Non-columnar datasets receive a message directing to the standard analysis endpoint.
