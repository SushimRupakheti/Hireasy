import { Router } from "express";
import { MessageController } from "../controllers/message.controller";
import { authorizedMiddleWare } from "../middleware/authorized.middleware";

const router = Router();
const controller = new MessageController();

router.use(authorizedMiddleWare);
router.get("/", controller.getMine.bind(controller));
router.post("/", controller.sendMine.bind(controller));
router.patch("/read", controller.markMineRead.bind(controller));

export default router;
