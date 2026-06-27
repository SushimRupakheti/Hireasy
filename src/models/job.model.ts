import mongoose, { Document, Schema } from "mongoose";
import { CreateJobDto } from "../types/job.type";

const jobSchema = new Schema(
  {
    roleType: { type: String, required: true, trim: true },
    numberOfWorkers: { type: Number, required: true, min: 1 },
    pay: { type: Number, required: true, min: 1 },
    shift: {
      type: String,
      required: true,
      enum: ["Morning", "Night", "Rotational", "Full Day"],
    },
    location: { type: String, required: true, trim: true },
    job_date: { type: Date, required: true },
    photos: [{ type: String }],
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "open", "closed", "filled", "cancelled"],
      default: "pending",
    },
    appliedWorkers: {
      type: [
        {
          worker: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
          },
          appliedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export interface IJob extends CreateJobDto, Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  appliedWorkers: {
    worker: mongoose.Types.ObjectId;
    status: "pending" | "accepted" | "rejected";
    appliedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export const JobModel = mongoose.model<IJob>("Job", jobSchema);
