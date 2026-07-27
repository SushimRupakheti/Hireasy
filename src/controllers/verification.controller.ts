import { Request, Response } from "express";
import {
  reviewVerificationDto,
  verificationListQueryDto,
} from "../dtos/verification.dto";
import { VerificationService } from "../services/verification.service";

const verificationService = new VerificationService();

const safeUser = (user: any) => {
  const value = typeof user?.toObject === "function" ? user.toObject() : user;
  if (!value) return value;
  const { password, ...safe } = value;
  return safe;
};

export class VerificationController {
  async submit(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?._id?.toString();
      const user = await verificationService.submit(userId);
      return res.status(201).json({
        success: true,
        message: "Verification request submitted",
        data: safeUser(user),
      });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async list(req: Request, res: Response) {
    try {
      const parsed = verificationListQueryDto.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten(),
        });
      }
      const result = await verificationService.list(parsed.data);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async review(req: Request, res: Response) {
    try {
      const userId = Array.isArray(req.params.userId)
        ? req.params.userId[0]
        : req.params.userId;
      const parsed = reviewVerificationDto.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten(),
        });
      }

      const user = await verificationService.review(
        (req.user as any)._id.toString(),
        userId,
        parsed.data.status,
        parsed.data.reason
      );
      return res.status(200).json({
        success: true,
        message: `Verification request ${parsed.data.status}`,
        data: safeUser(user),
      });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  private fail(res: Response, error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}
