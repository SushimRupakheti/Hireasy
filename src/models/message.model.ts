import mongoose, { Document, Schema } from "mongoose";

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["user", "company", "admin"],
      required: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  senderRole: "user" | "company" | "admin";
  body: string;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const MessageModel = mongoose.model<IMessage>("Message", messageSchema);
