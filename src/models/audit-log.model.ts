import mongoose, { Document, Schema } from "mongoose";

export type AuditTargetType = "user" | "job" | "application" | "document";

const auditLogSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true, trim: true },
    targetType: {
      type: String,
      enum: ["user", "job", "application", "document"],
      required: true,
    },
    targetId: { type: String, required: true, trim: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    reason: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now, required: true },
  },
  { timestamps: true }
);

export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  timestamp: Date;
}

export const AuditLogModel = mongoose.model<IAuditLog>(
  "AuditLog",
  auditLogSchema
);
