import { Router } from "express";
import { VerificationController } from "../controllers/verification.controller";
import {
  adminMiddleware,
  authorizedMiddleWare,
} from "../middleware/authorized.middleware";

const router = Router();
const controller = new VerificationController();

router.post(
  "/",
  authorizedMiddleWare,
  controller.submit.bind(controller)
);
router.get(
  "/",
  authorizedMiddleWare,
  adminMiddleware,
  controller.list.bind(controller)
);
router.patch(
  "/:userId",
  authorizedMiddleWare,
  adminMiddleware,
  controller.review.bind(controller)
);

export default router;
