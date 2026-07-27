import mongoose, { Document, Schema } from "mongoose";

const conversationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    unreadByAdmin: { type: Number, default: 0, min: 0 },
    unreadByUser: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export interface IConversation extends Document {
  user: mongoose.Types.ObjectId;
  lastMessage: string;
  lastMessageAt: Date;
  unreadByAdmin: number;
  unreadByUser: number;
  createdAt: Date;
  updatedAt: Date;
}

export const ConversationModel = mongoose.model<IConversation>(
  "Conversation",
  conversationSchema
);
