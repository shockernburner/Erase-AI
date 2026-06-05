---
name: Isolated task env can't see production connections
description: Why production Stripe (connectors-v2) connections set in the Publish pane don't appear in an isolated task-agent environment
---

The isolated task-agent environment (a separate clone of the repl) only surfaces
the **development** integration connection via `listConnections(...)` /
the connector proxy. A **production** connection — e.g. Stripe live keys the user
saves in the main project's Publish pane (stored as `Publishable` / `Secret`) —
does NOT propagate into the task environment. `listConnections('stripe')` there
returns only the `development` (`pk_test_`/`sk_test_`) connection, no matter how
long you poll, even after the user has correctly saved the live keys.

**Why:** the production connection is bound to the main repl/deployment, not the
isolated clone the task agent runs in.

**How to apply:** Any "go live" operation that needs the production connection —
seeding the live catalog (`REPLIT_DEPLOYMENT=1 pnpm --filter @workspace/scripts
run seed-stripe`), confirming the live managed webhook, verifying a live
checkout — must be run from the MAIN project (after merge / re-publish), not from
the task agent. From the task env you can only verify code wiring and run the
seed against the dev/test connection. Don't burn time polling for a prod
connection in a task env; hand the live steps off to the main project.
