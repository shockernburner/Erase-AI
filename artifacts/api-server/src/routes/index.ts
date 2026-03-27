import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eraseaiRouter from "./eraseai";
import datasetsRouter from "./datasets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eraseaiRouter);
router.use("/datasets", datasetsRouter);

export default router;
