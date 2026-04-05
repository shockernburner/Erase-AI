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
*   **Interactive Data Display:** Features like side-by-side diffs for erasure verification and interactive analysis results.
*   **Workflow Orchestration:** "Run Demo" buttons automate complex workflows with progress feedback.
*   **Contextual Upgrade Prompts:** Guides free users to upgrade when feature limits are met.

**Feature Specifications:**

*   **EraseAI App:** Includes live demo, AI Dataset Unlearning Engine (upload, preview, delete/redact, version history, diffs, Forget Score, audit log), Dataset Intelligence Engine (PII, bias, toxic content detection with auto-fix, dataset profiling), ML Feedback Engine (rule-based recommendations with code snippets), Authentication (Email/Password, Google OAuth, Apple Sign-In), Payments & Access Control (four-tier pricing, Airwallex integration, feature gating), API Key System & Public API v1 (developer dashboard, plan-aware key limits), API Rate Limiting & Usage Tracking, Personal Mode (advisory text analysis, content rewrite assistant, continuous monitoring), Social Posts Page (marketing hub for Personal Mode), Developer Mode (AI Exposure Control for prompts and code with analyze/sanitize endpoints, history, rate limits).
*   **Webhook System:** Allows users to configure webhooks triggered by dataset events with exponential backoff and SSRF protection.
*   **EraseAI "How It Works" Tier Demo Video:** A separate React-based animated video (`artifacts/eraseai-video`) demonstrating tier progression and Personal Mode features with distinct color themes.
*   **EraseAI Browser Extension (AI Firewall):** A Chrome extension (`extension/`) that intercepts and scans prompts before they are sent to AI platforms, using the `/api/dev/analyze` and `/api/dev/sanitize` endpoints, providing real-time risk assessment and sanitization.
*   **Firewall Integration Documentation:** In-app documentation page (`FirewallDocs.tsx`) covering extension installation, API endpoints (ping, analyze, sanitize, history), extension architecture (content script, service worker, popup), rate limits/errors, supported platforms (ChatGPT, Claude, Gemini, Replit), and custom platform integration guide. Accessible via user menu → "Firewall Docs". i18n supported across all 6 locales.

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