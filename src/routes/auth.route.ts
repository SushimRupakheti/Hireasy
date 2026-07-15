import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import upload, { uploadSingleProfileImage } from "../middlewares/upload-profile";
import {
  adminMiddleware,
  authorizedMiddleWare,
} from "../middleware/authorized.middleware";
import { uploadSingleUserDocument } from "../middlewares/upload-user-document";
import { rateLimit } from "../middleware/rate-limit.middleware";

const router: Router = Router();
const authController = new AuthController();

router.post(
  '/register',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: "register" }),
  upload.none(),
  authController.registerUser
);
router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: "login" }),
  authController.loginUser
);
router.post('/logout', authController.logoutUser);
router.get('/me', authorizedMiddleWare, authController.getCurrentUser);
router.post(
  "/me/profile-picture",
  authorizedMiddleWare,
  uploadSingleProfileImage,
  authController.uploadMyProfilePicture
);
router.post(
  '/me/document',
  authorizedMiddleWare,
  uploadSingleUserDocument,
  authController.uploadUserDocument
);
router.get(
  '/me/document/download',
  authorizedMiddleWare,
  authController.downloadMyDocument
);
router.delete(
  '/me/document',
  authorizedMiddleWare,
  authController.deleteMyDocument
);
router.put('/update/:id',authController.updateUser);
router.patch(
  '/:id/status',
  authorizedMiddleWare,
  adminMiddleware,
  authController.updateUserStatus
);
router.get(
  '/:id/document/download',
  authorizedMiddleWare,
  adminMiddleware,
  authController.downloadUserDocument
);
router.get('/:id', authController.getUserById);
router.post("/request-password-reset", authController.sendResetPasswordEmail);
router.post("/reset-password/:token", authController.resetPassword);

export default router;
