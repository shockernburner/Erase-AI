import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import { corsMiddleware } from "./middlewares/corsMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { getStripeSync } from "./lib/stripe";

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
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    if (!Buffer.isBuffer(req.body)) {
      logger.error("Stripe webhook body is not a Buffer — express.json() ran first");
      res.status(500).json({ error: "Webhook processing error" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      const sync = await getStripeSync();
      await sync.processWebhook(req.body, sig);
      res.status(200).json({ received: true });
    } catch (err) {
      logger.error({ err }, "Stripe webhook processing failed");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

export default app;
