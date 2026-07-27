import { Request, Response } from "express";
import z from "zod";
import { notificationService } from "../services/notification.service";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

const param = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export class NotificationController {
  async list(req: Request, res: Response) {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          errors: parsed.error.flatten(),
        });
      }
      const result = await notificationService.list(
        (req.user as any)._id.toString(),
        parsed.data
      );
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async markAsRead(req: Request, res: Response) {
    try {
      const notificationId = param(req.params.notificationId);
      if (!notificationId) {
        return res.status(400).json({ success: false, message: "notificationId is required" });
      }
      const data = await notificationService.markAsRead(
        (req.user as any)._id.toString(),
        notificationId
      );
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async markAllAsRead(req: Request, res: Response) {
    try {
      const data = await notificationService.markAllAsRead(
        (req.user as any)._id.toString()
      );
      return res.status(200).json({
        success: true,
        message: "All notifications marked as read",
        data,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }
}
