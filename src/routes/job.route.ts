import { Router } from "express";
import { JobController } from "../controllers/job.controller";
import { authorizedMiddleWare, companyMiddleware } from "../middleware/authorized.middleware";

const router: Router = Router();
const jobController = new JobController();

router.post("/", authorizedMiddleWare, companyMiddleware, jobController.createJob);

export default router;
