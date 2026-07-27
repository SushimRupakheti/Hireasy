import mongoose from "mongoose";
import { ConversationModel } from "../models/conversation.model";
import { MessageModel } from "../models/message.model";
import { UserModel } from "../models/user.model";
import { HttpError } from "../errors/http-error";
import { notificationService } from "./notification.service";

const userFields =
  "firstName lastName companyName email role profileImage status";

function validId(id: string, label: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(400, `Invalid ${label}`);
  }
}

export class MessageService {
  private async userConversation(userId: string) {
    validId(userId, "user id");
    const user = await UserModel.findOne({
      _id: userId,
      role: { $in: ["user", "company"] },
    }).select("_id role");
    if (!user) throw new HttpError(404, "User not found");

    return ConversationModel.findOneAndUpdate(
      { user: userId },
      {
        $setOnInsert: {
          user: userId,
          lastMessageAt: new Date(),
          unreadByAdmin: 0,
          unreadByUser: 0,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );
  }

  async sendFromUser(userId: string, role: "user" | "company", body: string) {
    const conversation = await this.userConversation(userId);
    const message = await MessageModel.create({
      conversation: conversation._id,
      sender: userId,
      senderRole: role,
      body,
    });

    await ConversationModel.updateOne(
      { _id: conversation._id },
      {
        $set: { lastMessage: body, lastMessageAt: message.createdAt },
        $inc: { unreadByAdmin: 1 },
      }
    );

    const admins = await UserModel.find({ role: "admin" }).select("_id").lean();
    await Promise.all(
      admins.map((admin) =>
        notificationService.create({
          recipient: admin._id,
          type: "support_message_received",
          title: "New support message",
          message: "A user sent a new support message.",
          data: { conversationId: conversation._id.toString(), userId },
          actionUrl: `/admin/messages/${userId}`,
        })
      )
    );
    return message;
  }

  async sendFromAdmin(adminId: string, userId: string, body: string) {
    const conversation = await this.userConversation(userId);
    const message = await MessageModel.create({
      conversation: conversation._id,
      sender: adminId,
      senderRole: "admin",
      body,
    });

    await ConversationModel.updateOne(
      { _id: conversation._id },
      {
        $set: { lastMessage: body, lastMessageAt: message.createdAt },
        $inc: { unreadByUser: 1 },
      }
    );
    await notificationService.create({
      recipient: userId,
      type: "support_reply_received",
      title: "Admin replied",
      message: body.length > 120 ? `${body.slice(0, 117)}...` : body,
      data: { conversationId: conversation._id.toString() },
      actionUrl: "/messages",
    });
    return message;
  }

  async getUserMessages(
    userId: string,
    query: { page: number; limit: number }
  ) {
    const conversation = await this.userConversation(userId);
    return this.getMessages(conversation._id.toString(), query);
  }

  async getAdminMessages(
    userId: string,
    query: { page: number; limit: number }
  ) {
    const conversation = await this.userConversation(userId);
    return this.getMessages(conversation._id.toString(), query);
  }

  private async getMessages(
    conversationId: string,
    query: { page: number; limit: number }
  ) {
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      MessageModel.find({ conversation: conversationId })
        .populate("sender", userFields)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      MessageModel.countDocuments({ conversation: conversationId }),
    ]);
    return {
      conversationId,
      data,
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

  async listConversations(query: { page: number; limit: number }) {
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      ConversationModel.find()
        .populate("user", userFields)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      ConversationModel.countDocuments(),
    ]);
    return {
      data,
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

  async markReadByUser(userId: string) {
    const conversation = await this.userConversation(userId);
    const now = new Date();
    const result = await MessageModel.updateMany(
      { conversation: conversation._id, senderRole: "admin", readAt: null },
      { $set: { readAt: now } }
    );
    await ConversationModel.updateOne(
      { _id: conversation._id },
      { $set: { unreadByUser: 0 } }
    );
    return { updatedCount: result.modifiedCount };
  }

  async markReadByAdmin(userId: string) {
    const conversation = await this.userConversation(userId);
    const now = new Date();
    const result = await MessageModel.updateMany(
      { conversation: conversation._id, senderRole: { $ne: "admin" }, readAt: null },
      { $set: { readAt: now } }
    );
    await ConversationModel.updateOne(
      { _id: conversation._id },
      { $set: { unreadByAdmin: 0 } }
    );
    return { updatedCount: result.modifiedCount };
  }
}

export const messageService = new MessageService();
