import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import { corsMiddleware } from "./middlewares/corsMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { getStripeSync } from "./lib/stripe";
import { createStripeWebhookHandler } from "./lib/billing/webhook-source.mjs";
import { reconcileRecentSubscriptions } from "./lib/billing/reconcile";
import { reconcileTeamSubscriptions } from "./lib/billing/team";

const app: Express = express();

// We sit behind Replit's edge proxy in production (and behind the workspace
// proxy in dev). Without this, `req.ip` collapses to the proxy's IP for every
// caller, which would make the per-IP burst limiter on /api/dev/ping behave
// as one global 30 req/min bucket and serve 429s to all clients after the
// first ~30 pings from anywhere. Trusting one upstream hop tells Express to
// honour X-Forwarded-For from the immediate proxy, recovering the real
// client IP. (We trust exactly one hop, not all hops, so a downstream client
// can't spoof X-Forwarded-For to escape the limiter.)
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(corsMiddleware());
app.use(cookieParser());

// Stripe webhook MUST be registered before express.json() — stripe-replit-sync
// verifies the signature against the raw request body, so it needs the
// untouched Buffer. Once express.json() parses the body the signature check
// fails. Keep this route above the JSON parser.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  createStripeWebhookHandler({
    getSync: getStripeSync,
    // Personal/Developer plans onto users, then Team subscriptions onto
    // organizations; one failing doesn't stop the other.
    reconcile: async () => {
      const results = await Promise.allSettled([reconcileRecentSubscriptions(), reconcileTeamSubscriptions()]);
      for (const r of results) if (r.status === "rejected") logger.error({ err: r.reason }, "Subscription reconcile failed");
    },
    logger,
  }),
);

// One-container deployments (Docker on Google Cloud Run, AWS App Runner…):
// serve the built website from the same server. On Replit the website is a
// separate static service and WEB_DIST_DIR is unset.
const webDistDir = process.env.WEB_DIST_DIR;
if (webDistDir) {
  const root = path.resolve(webDistDir);
  app.use(express.static(root, { index: false, maxAge: "1h" }));
  // Prerendered pages live at _pages/<path>.html (see artifacts/eraseai/scripts/prerender.mjs);
  // anything else is the single-page app's index.html.
  const pagesDir = path.join(root, "_pages");
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    const page = path.join(pagesDir, `${req.path.replace(/\/$/, "")}.html`);
    const file = page.startsWith(pagesDir + path.sep) && fs.existsSync(page) ? page : path.join(root, "index.html");
    res.sendFile(file);
  });
  logger.info({ root }, "Serving the website from WEB_DIST_DIR");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

export default app;
