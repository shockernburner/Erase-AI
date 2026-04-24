import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Defensive Host-based redirect: if a request lands here under the legacy
// Replit-default subdomain (e.g. eraseai.replit.app or any *.replit.app
// alias) instead of the canonical eraseai.ai domain, 308 it to the same
// path on eraseai.ai. This recovers users (and old extension installs)
// that have a stale .replit.app URL baked into their config and cannot
// otherwise reach the production server.
export function legacyHostRedirect(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const host = (req.headers.host || "").toLowerCase().split(":")[0];
  if (host === "eraseai.replit.app" || host.endsWith(".eraseai.replit.app")) {
    const target = `https://eraseai.ai${req.originalUrl || req.url}`;
    res.redirect(308, target);
    return;
  }
  next();
}
app.use(legacyHostRedirect);

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
app.use(cors({ credentials: true, origin: true }));
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
