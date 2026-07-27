import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import {
  adminMiddleware,
  authorizedMiddleWare,
} from "../middleware/authorized.middleware";
import { rateLimit } from "../middleware/rate-limit.middleware";
import { AuthController } from "../controllers/auth.controller";
import { MessageController } from "../controllers/message.controller";

const router = Router();
const adminController = new AdminController();
const authController = new AuthController();
const messageController = new MessageController();
const requireAdmin = [authorizedMiddleWare, adminMiddleware];

router.post(
  "/auth/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: "admin-login" }),
  adminController.login.bind(adminController)
);

router.get("/dashboard", requireAdmin, adminController.dashboard.bind(adminController));

router.get("/users", requireAdmin, adminController.listUsers.bind(adminController));
router.get("/users/:id", requireAdmin, adminController.getUser.bind(adminController));
router.patch(
  "/users/:id/status",
  requireAdmin,
  adminController.updateUserStatus.bind(adminController)
);
router.patch("/users/:id", requireAdmin, adminController.updateUser.bind(adminController));
router.delete("/users/:id", requireAdmin, adminController.deleteUser.bind(adminController));

router.get(
  "/companies",
  requireAdmin,
  adminController.listCompanies.bind(adminController)
);
router.get(
  "/companies/:id",
  requireAdmin,
  adminController.getCompany.bind(adminController)
);
router.patch(
  "/companies/:id/status",
  requireAdmin,
  adminController.updateUserStatus.bind(adminController)
);
router.patch(
  "/companies/:id",
  requireAdmin,
  adminController.updateUser.bind(adminController)
);

router.get(
  "/users/:id/document/download",
  requireAdmin,
  authController.downloadUserDocument.bind(authController)
);
router.get("/documents/pending", requireAdmin, adminController.pendingDocuments.bind(adminController));
router.patch(
  "/users/:id/document/approve",
  requireAdmin,
  adminController.approveDocument.bind(adminController)
);
router.patch(
  "/users/:id/document/reject",
  requireAdmin,
  adminController.rejectDocument.bind(adminController)
);

router.get("/jobs", requireAdmin, adminController.listJobs.bind(adminController));
router.get("/jobs/:id", requireAdmin, adminController.getJob.bind(adminController));
router.patch(
  "/jobs/:id/status",
  requireAdmin,
  adminController.updateJobStatus.bind(adminController)
);
router.patch("/jobs/:id", requireAdmin, adminController.updateJob.bind(adminController));
router.delete("/jobs/:id", requireAdmin, adminController.deleteJob.bind(adminController));

router.get(
  "/applications",
  requireAdmin,
  adminController.listApplications.bind(adminController)
);
router.patch(
  "/jobs/:jobId/applications/:workerId/status",
  requireAdmin,
  adminController.updateApplicationStatus.bind(adminController)
);

router.get("/audit-logs", requireAdmin, adminController.auditLogs.bind(adminController));

router.get(
  "/messages",
  requireAdmin,
  messageController.listConversations.bind(messageController)
);
router.get(
  "/messages/:userId",
  requireAdmin,
  messageController.getConversation.bind(messageController)
);
router.post(
  "/messages/:userId",
  requireAdmin,
  messageController.reply.bind(messageController)
);
router.patch(
  "/messages/:userId/read",
  requireAdmin,
  messageController.markConversationRead.bind(messageController)
);

export default router;
