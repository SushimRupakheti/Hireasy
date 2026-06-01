import mongoose, { Document, Schema } from "mongoose";
import { CreateJobDto } from "../types/job.type";

const jobSchema = new Schema(
  {
    roleType: { type: String, required: true, trim: true },
    numberOfWorkers: { type: Number, required: true, min: 1 },
    shift: {
      type: String,
      required: true,
      enum: ["Morning", "Night", "Rotational", "Full Day"],
    },
    location: { type: String, required: true, trim: true },
    photos: [{ type: String }],
    description: { type: String, required: true, trim: true },
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
  createdAt: Date;
  updatedAt: Date;
}

export const JobModel = mongoose.model<IJob>("Job", jobSchema);
