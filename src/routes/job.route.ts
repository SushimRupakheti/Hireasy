import { Router } from "express";
import { JobController } from "../controllers/job.controller";
import {
  authorizedMiddleWare,
  companyMiddleware,
  verifiedUserMiddleware,
} from "../middleware/authorized.middleware";

const router: Router = Router();
const jobController = new JobController();

router.get("/", jobController.getAllJobs);
router.post(
  "/",
  authorizedMiddleWare,
  verifiedUserMiddleware,
  companyMiddleware,
  jobController.createJob
);

router.get(
  "/mine",
  authorizedMiddleWare,
  verifiedUserMiddleware,
  companyMiddleware,
  jobController.getMyJobs
);
router.get(
  "/applied",
  authorizedMiddleWare,
  verifiedUserMiddleware,
  jobController.getMyApplications
);

router.get("/:jobId", jobController.getJobById);
router.patch(
  "/:jobId",
  authorizedMiddleWare,
  verifiedUserMiddleware,
  companyMiddleware,
  jobController.updateJob
);
router.delete(
  "/:jobId",
  authorizedMiddleWare,
  verifiedUserMiddleware,
  companyMiddleware,
  jobController.deleteJob
);
router.patch(
  "/:jobId/status",
  authorizedMiddleWare,
  verifiedUserMiddleware,
  companyMiddleware,
  jobController.updateJobStatus
);
router.get(
  "/:jobId/applicants",
  authorizedMiddleWare,
  verifiedUserMiddleware,
  companyMiddleware,
  jobController.getJobApplicants
);
router.post(
  "/:jobId/apply",
  authorizedMiddleWare,
  verifiedUserMiddleware,
  jobController.applyToJob
);
router.delete(
  "/:jobId/apply",
  authorizedMiddleWare,
  verifiedUserMiddleware,
  jobController.withdrawApplication
);

export default router;
