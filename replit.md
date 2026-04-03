# Overview

This project is a pnpm workspace monorepo using TypeScript, designed to build a full-stack web application called EraseAI. EraseAI is a demo-ready application showcasing AI "machine unlearning" capabilities, targeting the ethical AI and data governance market.

**EraseAI Vision:** To provide a comprehensive platform for managing and curating AI training data, ensuring data quality, privacy, and fairness through automated analysis, unlearning operations, and actionable ML feedback. The platform aims to be "Git for AI Training Data," offering version control, auditability, and verifiable data transformation.

**Key Capabilities:**
*   **AI Dataset Unlearning Engine:** Upload, version, delete, redact, and verify erasure of sensitive or unwanted data from datasets.
*   **Dataset Intelligence Engine:** Automated analysis for PII, bias, toxic content, duplicates, and data quality issues, with auto-fix capabilities.
*   **ML Feedback Engine:** Rule-based recommendations for ML pipeline adjustments based on dataset analysis, including code snippets.
*   **Authentication & Access Control:** Secure user management with email/password and social logins, and tiered access based on subscription plans.
*   **Payments:** Integration with Airwallex for managing paid subscriptions.

The project leverages a modern stack including Express.js for the API, PostgreSQL with Drizzle ORM for data persistence, and React for the frontend.

# User Preferences

I prefer iterative development. Ask before making major changes. I prefer to use pnpm for package management.

# System Architecture

The project is structured as a pnpm monorepo with `artifacts/` for deployable applications (api-server, eraseai frontend) and `lib/` for shared libraries (database, API spec, generated clients/schemas).

**Technical Stack:**
*   **Monorepo:** pnpm workspaces
*   **Backend:** Node.js (v24), Express 5
*   **Database:** PostgreSQL, Drizzle ORM
*   **TypeScript:** v5.9
*   **Validation:** Zod (v4), `drizzle-zod`
*   **API Codegen:** Orval (from OpenAPI spec)
*   **Build Tool:** esbuild (for CJS bundles)

**Core Architectural Decisions:**
*   **TypeScript Monorepo:** Enforces type safety across the entire project with composite projects for efficient type checking and build processes.
*   **API-First Development:** Uses OpenAPI for API specification (`lib/api-spec`), which then generates React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`) for client and server-side validation respectively, ensuring consistency.
*   **Layered Backend:** The `api-server` utilizes a clear separation of concerns with routes, middleware, and a dedicated database layer (`lib/db`).
*   **Version-Controlled Datasets:** The `eraseai` application implements a robust versioning system for datasets, allowing immutable transformations (delete/redact) and historical tracking.
*   **Rule-Based AI Logic:** Both the Dataset Intelligence Engine and ML Feedback Engine operate on rule-based systems for analysis and recommendations, enabling clear logic and auditability.
*   **Secure Authentication:** Session-based authentication with httpOnly cookies, bcrypt hashing for passwords, and support for OAuth (Google, Apple).
*   **Scalable Payments:** Integration with Airwallex for one-time payments, designed for a subscription-like model managed at the application level.

**UI/UX Decisions (EraseAI Frontend):**
*   **Design:** Dark-mode UI with a cyan accent branding.
*   **Interactive Data Display:** Features like side-by-side Before/After diffs for erasure verification, interactive analysis results panels with summary cards, and expandable flagged row lists.
*   **Workflow Orchestration:** "Run Demo" and "Run Full Demo" buttons automate complex workflows, providing step-by-step progress feedback to the user.
*   **Contextual Upgrade Prompts:** Free users encountering feature limits are presented with upgrade prompts.

**Feature Specifications:**

*   **EraseAI App:**
    *   **Live Demo:** End-to-end demonstration of data upload, preview, erasure, and verification.
    *   **AI Dataset Unlearning Engine:** Handles dataset uploads (JSON/CSV/TXT), cloud URL import (HTTP/HTTPS CSV/JSON/TXT), column-level deletion for CSV datasets (with chip UI and confirmation), "Delete" or "Redact" operations creating new immutable versions, version history browsing, side-by-side diffs (red=deleted, yellow=redacted), Data Impact panel with Forget Score, operation audit log, and downloadable datasets in clean/redacted/full modes.
    *   **Dataset Intelligence Engine:** Automated PII detection (emails, phone numbers), biased language (gender/racial), toxic content, duplicate rows, low-quality entry detection. Interactive results with category summary, expandable flagged rows, per-category "Fix" buttons, and "Apply All Fixes." Dataset Profiling for CSV (delimiter detection, column-level profiling: type, missing%, cardinality, numeric stats, categorical top-N, bias detection, ML recommendations).
    *   **ML Feedback Engine:** Rule-based recommendations mapping detected issues to preprocessing, training, and evaluation suggestions. Recommendations include code snippets, priority levels, and are filterable/exportable (Markdown/JSON).
    *   **Authentication:** Email/Password (bcrypt), Google OAuth, Apple Sign-In. Session-based auth with httpOnly cookies. All dataset APIs require authentication, scoped by `userId`.
    *   **Payments & Access Control:** Four-tier pricing (Free, Pro $49/mo, Business $149/mo, Enterprise custom). Integration with Airwallex Payment Intents for checkout. Webhook processing for payment status updates. `requirePro()` middleware gates premium features (includes "business" tier). `requireBusiness()` middleware for Business+ features. Row limits: Free=100, Pro=1K, Business=10K, Enterprise=unlimited.
    *   **API Key System & Public API v1:** Pro/Business/Enterprise users can generate API keys from the Developer Dashboard. Keys are SHA-256 hashed (raw shown once). Plan-aware key limits: Pro=5, Business=20, Enterprise=100. Endpoints: `/api/developer/keys` (CRUD), `/api/developer/usage` (usage stats), `/api/v1/datasets/*` (upload, list, analyze, result, download). Bearer token auth via `apiKeyMiddleware.ts`. Schema: `api_keys` table in `lib/db/src/schema/auth.ts`.
    *   **API Rate Limiting & Usage Tracking:** Per-plan monthly rate limits: Pro=1,000 req/mo, Business=10,000 req/mo, Enterprise=unlimited. Middleware in `rateLimitMiddleware.ts` enforces limits and returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers. 429 response when exceeded. All API v1 requests logged to `api_usage` table (non-blocking). Developer Dashboard shows usage meter with progress bar, daily breakdown chart, and upgrade CTA near limits. Admin endpoint `GET /api/admin/api-usage` provides aggregate stats, top users, and daily trends.
    *   **Webhook System:** Max 1 webhook per user (enforced by unique DB index). CRUD endpoints under `/api/developer/webhooks`. Webhook dispatcher fires on `dataset.analyzed`, `dataset.erased`, `dataset.failed` events with 3-attempt exponential backoff (1s, 2s, 4s). "Send Test" button delivers test payload. Delivery history shows last 20 events. SSRF protection blocks localhost, private IPs, internal domains, and metadata endpoints. Schema: `webhooks` + `webhook_deliveries` tables in `lib/db/src/schema/auth.ts`. Dispatcher: `artifacts/api-server/src/lib/webhookDispatcher.ts`. Developer Dashboard UI shows webhook configuration, active/pause toggle, test button, and delivery history.

# External Dependencies

*   **PostgreSQL:** Primary database for all application data.
*   **Airwallex API:** Used for processing payments and managing user subscriptions.
*   **Google OAuth:** For social login functionality.
*   **Apple Sign-In:** For social login functionality.
*   **Orval:** Code generation tool for API clients and schemas from OpenAPI specifications.
*   **Drizzle ORM:** TypeScript ORM for interacting with PostgreSQL.
*   **Zod:** Schema declaration and validation library.
*   **Express.js:** Web application framework for the API server.
*   **React:** Frontend library for building user interfaces.
*   **React Query:** Data fetching and caching library for React.
*   **PapaParse:** (Implicitly used in `api-server` for CSV parsing)

**Internationalization (i18n):**
*   **Framework:** react-i18next with i18next and i18next-browser-languagedetector.
*   **Supported Languages:** English (en), French (fr), German (de), Spanish (es), Japanese (ja), Chinese (zh).
*   **Translation Files:** Located in `artifacts/eraseai/src/i18n/locales/{lang}.json`.
*   **Configuration:** `artifacts/eraseai/src/i18n/index.ts` — auto-detects browser language, stores preference in localStorage under key `eraseai-lang`.
*   **Language Selector:** `artifacts/eraseai/src/components/LanguageSelector.tsx` — globe icon dropdown in top-right corner, visible on both login page and main app header.
*   **Coverage:** LoginPage, Home (header/nav/pipeline/footer), PricingPage (all tiers/features/modals), AdminDashboard (header/stats/sections), DatasetSanitizer (upload area, key buttons, upgrade prompts).

**EraseAI "How It Works" Tier Demo Video:**

*   A separate video artifact (`artifacts/eraseai-video`) accessible at `/eraseai-video/`.
*   Built with React, Framer Motion, and Tailwind CSS as a ~50-second animated tier progression demo.
*   6 scenes: Intro → Free ($0) → Pro ($49) → Business ($149) → Enterprise/Government (Custom, "We build new APIs for your needs") → Outro.
*   Each tier scene has distinct color theming: Free=green, Pro=cyan, Business=orange/amber, Enterprise=gold.
*   Uses the scaffold's `useVideoPlayer` hook for scene advancement and automatic looping.
*   EraseAI branding: cyan (#06B6D4), dark background (#0a0a0f/#050508), Plus Jakarta Sans + JetBrains Mono fonts.
*   Auto-plays on load, loops continuously, no interactivity.
*   Scene files: `artifacts/eraseai-video/src/components/scenes/Scene{1-6}_*.tsx`.