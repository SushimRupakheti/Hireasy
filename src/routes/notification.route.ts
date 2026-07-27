import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { authorizedMiddleWare } from "../middleware/authorized.middleware";

const router = Router();
const controller = new NotificationController();

router.use(authorizedMiddleWare);
router.get("/", controller.list.bind(controller));
router.patch("/read-all", controller.markAllAsRead.bind(controller));
router.patch("/:notificationId/read", controller.markAsRead.bind(controller));

export default router;
