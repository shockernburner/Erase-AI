import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import { corsMiddleware } from "./middlewares/corsMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

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
app.use(express.json({
  verify: (req: express.Request, _res, buf) => {
    if (req.url?.includes("/billing/webhook")) {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    }
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

export default app;
