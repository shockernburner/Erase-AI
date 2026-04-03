import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import eraseaiRouter from "./eraseai";
import datasetsRouter from "./datasets";
import billingRouter from "./billing";
import feedbackRouter from "./feedback";
import adminRouter from "./admin";
import developerRouter from "./developer";
import v1Router from "./v1";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eraseaiRouter);
router.use("/datasets", datasetsRouter);
router.use("/billing", billingRouter);
router.use(feedbackRouter);
router.use(adminRouter);
router.use("/developer", developerRouter);
router.use("/v1", v1Router);

export default router;
