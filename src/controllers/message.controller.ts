import { Request, Response } from "express";
import {
  messageListQueryDto,
  sendMessageDto,
} from "../dtos/message.dto";
import { messageService } from "../services/message.service";

const param = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export class MessageController {
  async getMine(req: Request, res: Response) {
    try {
      const parsed = messageListQueryDto.safeParse(req.query);
      if (!parsed.success) return this.validationError(res, parsed.error.flatten());
      const data = await messageService.getUserMessages(
        (req.user as any)._id.toString(),
        parsed.data
      );
      return res.status(200).json({ success: true, ...data });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async sendMine(req: Request, res: Response) {
    try {
      const user = req.user as any;
      if (user.role === "admin") {
        return res.status(403).json({
          success: false,
          message: "Admins must use the admin messaging endpoint",
        });
      }
      const parsed = sendMessageDto.safeParse(req.body);
      if (!parsed.success) return this.validationError(res, parsed.error.flatten());
      const data = await messageService.sendFromUser(
        user._id.toString(),
        user.role,
        parsed.data.message
      );
      return res.status(201).json({
        success: true,
        message: "Message sent to admin",
        data,
      });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async markMineRead(req: Request, res: Response) {
    try {
      const data = await messageService.markReadByUser(
        (req.user as any)._id.toString()
      );
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async listConversations(req: Request, res: Response) {
    try {
      const parsed = messageListQueryDto.safeParse(req.query);
      if (!parsed.success) return this.validationError(res, parsed.error.flatten());
      const result = await messageService.listConversations(parsed.data);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async getConversation(req: Request, res: Response) {
    try {
      const userId = param(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, message: "userId is required" });
      const parsed = messageListQueryDto.safeParse(req.query);
      if (!parsed.success) return this.validationError(res, parsed.error.flatten());
      const result = await messageService.getAdminMessages(userId, parsed.data);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async reply(req: Request, res: Response) {
    try {
      const userId = param(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, message: "userId is required" });
      const parsed = sendMessageDto.safeParse(req.body);
      if (!parsed.success) return this.validationError(res, parsed.error.flatten());
      const data = await messageService.sendFromAdmin(
        (req.user as any)._id.toString(),
        userId,
        parsed.data.message
      );
      return res.status(201).json({
        success: true,
        message: "Reply sent",
        data,
      });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async markConversationRead(req: Request, res: Response) {
    try {
      const userId = param(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, message: "userId is required" });
      const data = await messageService.markReadByAdmin(userId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  private validationError(res: Response, errors: unknown) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  private fail(res: Response, error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}
