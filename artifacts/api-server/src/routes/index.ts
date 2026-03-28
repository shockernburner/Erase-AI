import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import eraseaiRouter from "./eraseai";
import datasetsRouter from "./datasets";
import billingRouter from "./billing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eraseaiRouter);
router.use("/datasets", datasetsRouter);
router.use("/billing", billingRouter);

export default router;
