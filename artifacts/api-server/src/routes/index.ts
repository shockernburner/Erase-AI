import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health";
import authRouter, { CURRENT_TERMS_VERSION } from "./auth";
import eraseaiRouter from "./eraseai";
import datasetsRouter from "./datasets";
import billingRouter from "./billing";
import feedbackRouter from "./feedback";
import contactRouter from "./contact";
import adminRouter from "./admin";
import developerRouter from "./developer";
import v1Router from "./v1";
import analyticsRouter from "./analytics";
import personalRouter from "./personal";
import devRouter from "./dev";
import extensionRouter from "./extension";
import mobileRouter from "./mobile";

// Routes that must remain reachable even when the logged-in user has not yet
// accepted the latest Terms of Service. /dev/ping is a public health probe
// hit by the browser extension and the in-app Go-Live checklist; gating it
// behind terms acceptance would make the popup report a "server unreachable"
// state for fully signed-in users.
// /dev/demo-key (task #158) is a public, unauthenticated endpoint for
// public-visitor demo key issuance — terms acceptance doesn't apply.
const TERMS_BYPASS_PATHS = new Set<string>(["/dev/ping", "/dev/demo-key"]);

function requireTermsAcceptance(req: Request, res: Response, next: NextFunction) {
  if (TERMS_BYPASS_PATHS.has(req.path)) {
    next();
    return;
  }
  if (!req.isAuthenticated()) {
    next();
    return;
  }
  const user = req.user as { termsVersion?: string | null } | undefined;
  if (user && user.termsVersion !== CURRENT_TERMS_VERSION) {
    res.status(403).json({ error: "terms_not_accepted", message: "You must accept the Terms of Service before using this feature." });
    return;
  }
  next();
}

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(contactRouter);
router.use(extensionRouter);
router.use("/mobile", mobileRouter);
router.use(requireTermsAcceptance);
router.use(eraseaiRouter);
router.use("/datasets", datasetsRouter);
router.use("/billing", billingRouter);
router.use(feedbackRouter);
router.use(adminRouter);
router.use("/developer", developerRouter);
router.use("/v1", v1Router);
router.use(analyticsRouter);
router.use(personalRouter);
router.use("/dev", devRouter);

export default router;
