import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eraseaiRouter from "./eraseai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eraseaiRouter);

export default router;
