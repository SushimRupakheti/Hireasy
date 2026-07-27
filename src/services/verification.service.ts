import mongoose from "mongoose";
import { HttpError } from "../errors/http-error";
import { AuditLogModel } from "../models/audit-log.model";
import { UserModel } from "../models/user.model";
import { notificationService } from "./notification.service";

export class VerificationService {
  async submit(userId: string) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new HttpError(400, "Invalid user id");
    }

    const user = await UserModel.findById(userId);
    if (!user) throw new HttpError(404, "User not found");
    if (user.role === "admin") {
      throw new HttpError(403, "Admins cannot submit verification requests");
    }
    if (user.status === "verified") {
      throw new HttpError(409, "User is already verified");
    }

    const currentRequest = (user as any).verificationRequest;
    if (currentRequest?.status === "pending") {
      return user;
    }

    user.status = "pending";
    (user as any).verificationRequest = {
      status: "pending",
      requestedAt: new Date(),
    };
    await user.save();
    return user;
  }

  async list(query: {
    page: number;
    limit: number;
    status?: "pending" | "approved" | "rejected";
  }) {
    const filter: Record<string, any> = {
      verificationRequest: { $ne: null },
    };
    if (query.status) filter["verificationRequest.status"] = query.status;

    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      UserModel.find(filter)
        .select("-password")
        .populate("verificationRequest.reviewedBy", "firstName lastName email")
        .sort({ "verificationRequest.requestedAt": -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      UserModel.countDocuments(filter),
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

  async review(
    adminId: string,
    userId: string,
    status: "verified" | "rejected",
    reason?: string
  ) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new HttpError(400, "Invalid user id");
    }

    const user = await UserModel.findOne({
      _id: userId,
      "verificationRequest.status": "pending",
    });
    if (!user) {
      throw new HttpError(404, "Pending verification request not found");
    }

    const oldValue = {
      status: user.status,
      verificationRequest: (user as any).verificationRequest,
    };
    user.status = status;
    (user as any).verificationRequest.status =
      status === "verified" ? "approved" : "rejected";
    (user as any).verificationRequest.reviewedAt = new Date();
    (user as any).verificationRequest.reviewedBy = adminId;
    (user as any).verificationRequest.reason = reason;
    await user.save();

    await AuditLogModel.create({
      adminId,
      action: `verification.${status}`,
      targetType: "user",
      targetId: userId,
      oldValue,
      newValue: {
        status: user.status,
        verificationRequest: (user as any).verificationRequest,
      },
      reason,
      timestamp: new Date(),
    });

    await notificationService.create({
      recipient: user._id,
      type: status === "verified" ? "account_verified" : "account_rejected",
      title: status === "verified" ? "Account verified" : "Verification rejected",
      message:
        status === "verified"
          ? "Your account has been verified. You can now access verified-user features."
          : `Your account verification was rejected${reason ? `: ${reason}` : "."}`,
      data: { status, reason: reason || null },
      actionUrl: "/profile",
    });

    return user;
  }
}
