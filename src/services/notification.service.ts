import mongoose from "mongoose";
import { HttpError } from "../errors/http-error";
import {
  NotificationModel,
  NotificationType,
} from "../models/notification.model";

type CreateNotificationInput = {
  recipient: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
};

export class NotificationService {
  async create(input: CreateNotificationInput) {
    return NotificationModel.create(input);
  }

  async list(
    recipient: string,
    query: { page: number; limit: number; unreadOnly: boolean }
  ) {
    const filter: Record<string, unknown> = { recipient };
    if (query.unreadOnly) filter.readAt = null;
    const skip = (query.page - 1) * query.limit;

    const [data, total, unreadCount] = await Promise.all([
      NotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      NotificationModel.countDocuments(filter),
      NotificationModel.countDocuments({ recipient, readAt: null }),
    ]);

    return {
      data,
      unreadCount,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNextPage: query.page * query.limit < total,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  async markAsRead(recipient: string, notificationId: string) {
    if (!mongoose.isValidObjectId(notificationId)) {
      throw new HttpError(400, "Invalid notification id");
    }

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, recipient },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) throw new HttpError(404, "Notification not found");
    return notification;
  }

  async markAllAsRead(recipient: string) {
    const result = await NotificationModel.updateMany(
      { recipient, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return { updatedCount: result.modifiedCount };
  }
}

export const notificationService = new NotificationService();
