import mongoose, { Document, Schema } from "mongoose";

export type NotificationType =
  | "account_verified"
  | "account_rejected"
  | "account_status_changed"
  | "document_approved"
  | "document_rejected"
  | "job_status_changed"
  | "application_received"
  | "application_status_changed"
  | "support_message_received"
  | "support_reply_received";

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "account_verified",
        "account_rejected",
        "account_status_changed",
        "document_approved",
        "document_rejected",
        "job_status_changed",
        "application_received",
        "application_status_changed",
        "support_message_received",
        "support_reply_received",
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    data: { type: Schema.Types.Mixed, default: {} },
    actionUrl: { type: String, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1 });

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  actionUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const NotificationModel = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);
