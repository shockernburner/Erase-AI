# Overview

This project, EraseAI, is a pnpm workspace monorepo using TypeScript, designed as a full-stack web application demonstrating AI "machine unlearning" capabilities. It targets the ethical AI and data governance market, aiming to be a "Git for AI Training Data" by providing a platform for managing and curating AI training data.

**Vision:** To offer a comprehensive platform for ensuring data quality, privacy, and fairness through automated analysis, unlearning operations, and actionable ML feedback.

**Key Capabilities:**
*   **AI Dataset Unlearning Engine:** For uploading, versioning, deleting, redacting, and verifying data erasure from datasets.
*   **Dataset Intelligence Engine:** Automated analysis for PII, bias, toxic content, duplicates, and data quality issues, with auto-fix functionalities.
*   **ML Feedback Engine:** Provides rule-based recommendations for ML pipeline adjustments.
*   **Authentication & Access Control:** Secure user management with tiered access.
*   **Payments:** Integration for managing paid subscriptions.

The project utilizes Express.js for the API, PostgreSQL with Drizzle ORM, and React for the frontend.

# User Preferences

I prefer iterative development. Ask before making major changes. I prefer to use pnpm for package management.

# System Architecture

The project is structured as a pnpm monorepo, separating deployable applications (`artifacts/`) from shared libraries (`lib/`).

**Technical Stack:**
*   **Monorepo:** pnpm workspaces
*   **Backend:** Node.js (v24), Express 5
*   **Database:** PostgreSQL, Drizzle ORM
*   **TypeScript:** v5.9
*   **Validation:** Zod (v4), `drizzle-zod`
*   **API Codegen:** Orval (from OpenAPI spec)

**Core Architectural Decisions:**
*   **TypeScript Monorepo:** Ensures type safety and efficient build processes.
*   **API-First Development:** Uses OpenAPI to generate client and server-side components, ensuring API consistency.
*   **Layered Backend:** `api-server` maintains clear separation of concerns.
*   **Version-Controlled Datasets:** Implements robust versioning for immutable data transformations and historical tracking.
*   **Rule-Based AI Logic:** Both Dataset Intelligence and ML Feedback engines use rule-based systems for auditable analysis and recommendations.
*   **Secure Authentication:** Session-based authentication with httpOnly cookies, bcrypt hashing, and OAuth support.
*   **Scalable Payments:** Airwallex integration for managing subscriptions.

**UI/UX Decisions (EraseAI Frontend):**
*   **Design:** Dark-mode UI with a cyan accent.
*   **Landing Page:** Video-first experience (`PublicLanding.tsx`) — full-screen autoplay video with Skip button, followed by stats bar (Data Points Scanned, Threats Detected, Uptime) aggregated from dataset_rows/personal_scans/dev_scans/analysis_results via `/api/public/stats`, 3-mode selector cards (Developer/Enterprise/Personal) with try-before-signup preview mode, "Join when you want" auth section with reusable `AuthForm.tsx` component, and contact footer (WhatsApp + email: director@vantward.com).
*   **Dashboard:** Card-based expandable grid (`Home.tsx`) for logged-in users — Dataset Sanitizer, Personal Mode, Developer Dashboard, Dev Mode, Firewall Docs, API Docs, Certifications, Pricing. Includes UserMenu with plan badge and Contact Us section.
*   **Signed-in App Shell (Task #175):** All signed-in views render inside `AppShell.tsx`, which provides a collapsible left sidebar persisted via `eraseai.sidebarOpen` localStorage. Sidebar groups: Personal, Firewall, Dataset Sanitizers, Documentation, Blogs, Legal — plus an admin-only group pinned to the bottom (Admin Dashboard, Analytics, plus owner-only Social Posts and Ad Content). The header carries a slim user pill (avatar + plan badge) with Manage/Upgrade Plan + Logout only — admin entries live in the sidebar, not the pill. App-level guards compute an `effectiveView` before render so unauthorized pages never flash; legal/contact pages bypass the terms-acceptance and trial-expired modals so users can read what they're being asked to accept. **Personal mode** is now scanner-only — the alerts/prompt-protection/risk-report/trends/history/dashboard panels were removed; the page accepts `.pdf/.docx/.zip/.txt/.csv/.tsv/.json/.jsonl/.md/.log` uploads via `lib/profile-extract.ts` (pdfjs-dist v4 worker via Vite `?url`, mammoth.browser, fflate; LinkedIn CSV→section name mapping; 200K char cap), runs sequential per-section `/personal/analyze` calls, renders collapsible per-section result cards with FlagBadge + RewritePanel, supports per-section "Apply suggested rewrite" (stored in `sanitizedSections` state) and a top-level "Download sanitized profile (.txt)" button. **FirewallHub** (`pages/FirewallHub.tsx`) lands on three primary surfaces — Browser Protection (extension .zip download), IDE Protection (link to Dev Mode), Key Management (inline create/list of API keys with copy-once UX) — followed by a default-visible manual `.zip` install panel. New hub pages: `DocumentationsHub.tsx` and `BlogsHub.tsx`.
*   **Preview Mode:** Unauthenticated users can click a mode card to preview dashboards with a "Back to Homepage" button and "Preview Mode" badge overlay.
*   **Plan-Based Routing:** After login, users land on their plan's default view — personal→PersonalMode, pro→DeveloperDashboard, business/enterprise→AnalyticsDashboard, free→Home dashboard.
*   **Interactive Data Display:** Features like side-by-side diffs for erasure verification and interactive analysis results.
*   **Workflow Orchestration:** "Run Demo" buttons automate complex workflows with progress feedback.
*   **Contextual Upgrade Prompts:** Guides free users to upgrade when feature limits are met.

**Feature Specifications:**

*   **EraseAI App:** Includes live demo, AI Dataset Unlearning Engine (upload, preview, delete/redact, version history, diffs, Forget Score, audit log), Dataset Intelligence Engine (PII, bias, toxic content detection with auto-fix, dataset profiling), ML Feedback Engine (rule-based recommendations with code snippets), Authentication (Email/Password, Google OAuth, Apple Sign-In), Payments & Access Control (four-tier pricing with monthly/annual billing toggle — Personal $5/mo or $54/yr, Pro $20/mo or $216/yr, Business $99/mo or $1069/yr, annual = round(monthly×12×0.9), Airwallex integration with `billing_period` metadata, feature gating), API Key System & Public API v1 (developer dashboard, plan-aware key limits), API Rate Limiting & Usage Tracking, Personal Mode (advisory text analysis, content rewrite assistant, continuous monitoring), Social Posts Page (marketing hub for Personal Mode), Developer Mode (AI Exposure Control for prompts and code with analyze/sanitize endpoints, history, rate limits).
*   **Webhook System:** Allows users to configure webhooks triggered by dataset events with exponential backoff and SSRF protection.
*   **EraseAI Pitch Deck:** 9-slide investor pitch deck (`artifacts/pitch-deck`) covering: Title, Problem (data leaks + $6.5B market), Platform Overview (4 capabilities), AI Firewall (prompt protection), Content Intelligence (scanning/rewriting/trends/personal mode), Developer Tools (SDK/dataset sanitizer), Pricing (5 tiers), Trust & Tech Stack (SOC 2/ISO/GDPR), Closing. Aligned with 83-second explainer video narrative.
*   **EraseAI "How It Works" Tier Demo Video:** A separate React-based animated video (`artifacts/eraseai-video`) demonstrating tier progression and Personal Mode features with distinct color themes.
*   **EraseAI Browser Extension (AI Firewall):** A Chrome extension (`extension/`) that intercepts and scans prompts before they are sent to AI platforms, using the `/api/dev/analyze` and `/api/dev/sanitize` endpoints, providing real-time risk assessment and sanitization. The popup is **self-diagnosing** (v1.2.0+): it probes `/api/dev/ping` (now a public, auth-aware health endpoint) and reports one of four states — connected (with plan pill), no_key, invalid_key, or server_unreachable — each with one-click recovery (e.g. reset custom URL, open canonical dashboard at `https://eraseai.ai/ai-firewall`). The "Get my API key" button always opens the canonical production URL, bypassing any misconfigured custom API URL the user may have entered. **v1.3.5 (task #142): attachment scanning.** The extension now also scans file attachments dropped or selected into the ChatGPT/Claude/Gemini composer alongside the prompt — text formats (.txt .md .csv .tsv .json .log .xml .html .yaml .sql) are extracted via FileReader and analysed as separate pieces; .pdf, .docx, .xlsx, images, and archives are detected by extension/MIME and surfaced as "skipped — review manually" rows in the panel with a Send Anyway override (full PDF/DOCX text extraction is deferred — pdf.js and mammoth both use eval/new Function which MV3's default CSP forbids; landing it requires a sandboxed-iframe shim). Limits: 5 MB per file, 15 MB total, 50 KB extracted per file, 8 KB analyse-chunk size. The `pieces` shape on outcome telemetry carries counts only — never file contents or names — and is bounded server-side in `outcome-source.mjs` `normalisePieces`. Extractor lives in `extension/src/file-extractor.js` and is loaded BEFORE `content.js` in the manifest's `content_scripts.js` array.
*   **Firewall Integration Documentation:** In-app documentation page (`FirewallDocs.tsx`) covering extension installation, API endpoints (ping, analyze, sanitize, history), extension architecture (content script, service worker, popup), rate limits/errors, supported platforms (ChatGPT, Claude, Gemini, Replit), and custom platform integration guide. Accessible via user menu → "Firewall Docs". i18n supported across all 6 locales. The Install section also includes an inline **"Your API key"** mini-card (paid plans) that lets users create a key and copy it once without leaving the docs page, plus an admin-only **Go-Live Checklist** card that probes `/api/dev/ping` and surfaces missing `VITE_CHROME_STORE_URL`/`VITE_EDGE_STORE_URL`/`VITE_FIREFOX_ADDON_URL` env vars before publishing.
*   **Terms of Service & License Agreement:** Professional legal documents protecting Vantward Solutions Pte. Ltd. from reverse engineering, scraping/cloning, API misuse, and competitive replication. Mandatory acceptance modal after login (blocks dashboard access until accepted). DB fields `terms_accepted_at` and `terms_version` on users table. API endpoints: `POST /auth/accept-terms`, `GET /auth/terms-version`. Public routes at `/terms` and `/license`. User menu "Terms & Legal" item. Footer links across Home, PublicLanding, and SEO pages. i18n supported across all 6 locales. Current terms version: `1.0`.
*   **SEO Infrastructure:** Full SEO setup with meta tags, OG tags, JSON-LD structured data, sitemap.xml, robots.txt. Public SEO landing pages accessible without login via wouter routing: /ai-firewall, /chatgpt-data-leak, /ai-prompt-security, /api-key-protection-ai, /terms, /license. Blog system at /blog with 3 posts. Per-page meta/OG/canonical via useSeoMeta hook. Internal links in homepage footer and cross-linked SEO pages/blog.
*   **Vantward Solutions Letterhead:** A professional A4 letterhead template (`artifacts/letterhead`) with navy/green branding, company logo, address (68 Circular Road, #02-01, Singapore 049422), contact details, and registration number. Two routes: `/` (blank template) and `/pitch-akij` (pitch letter to Akij Ventures Ltd. for EraseAI enterprise AI Firewall). Print-ready with CSS @page rules and "Print / Save as PDF" button.
*   **EraseAI Firewall Demo Video:** A ~38s animated social media video (`artifacts/firewall-video`) showcasing the AI Firewall feature with 8 scenes: Hook (glitch text), Problem (dev leaking secrets to ChatGPT), Solution Reveal (shield logo), Browser Demo (ChatGPT + EraseAI overlay with risk ring), Code Integration (VS Code/Replit/Xcode carousel), Sanitize Flow (before/after), API Power (curl + JSON), and CTA/Outro. Built with React + Framer Motion + Tailwind, auto-plays and loops.
*   **EraseAI "How It Works" Demo Video:** A ~70s animated product demo video (`artifacts/how-it-works-video`) with 5 scenes: Intro (6s, logo + tagline), Enterprise Mode (22s, upload CSV, scan analysis with 913 PII/167 dup/2 toxic, ML pipeline & feedback recs, apply fixes with 168 removed/751 redacted/91% forget score, download sanitized dataset), Personal Mode (16s, social media scanning, PII detection before/after, advisory text analysis, content rewrite assistant, continuous monitoring), Developer Mode (20s, prompt scanner, AI Firewall docs/installation, API keys & webhooks, IDE/browser extensions, auto-sanitize), Closing (6s, brand lockup + eraseai.ai + Singapore). Uses extracted video clips from source recording embedded via `<video>` elements plus animated overlays and callouts. Built with React + Framer Motion + Tailwind.

# External Dependencies

*   **PostgreSQL:** Primary database.
*   **Airwallex API:** For payment processing.
*   **Google OAuth:** For social logins.
*   **Apple Sign-In:** For social logins.
*   **Orval:** For OpenAPI-based code generation.
*   **Drizzle ORM:** For database interaction.
*   **Zod:** For schema validation.
*   **Express.js:** For the API server.
*   **React:** For the frontend UI.
*   **React Query:** For data fetching and caching.
*   **PapaParse:** For CSV parsing.
*   **react-i18next, i18next, i18next-browser-languagedetector:** For internationalization, supporting English, French, German, Spanish, Japanese, and Chinese.
*   **Framer Motion & Tailwind CSS:** Used in the demo video for animations and styling.