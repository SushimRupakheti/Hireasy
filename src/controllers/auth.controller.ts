import { AuthService } from "../services/auth.services";
import {
  createUserDto,
  LoginUserDto,
  UpdateUserStatusDto,
} from "../dtos/auth.dto";
import z from "zod";
import { Request, Response } from "express";
import fs from "fs/promises";



let authservice = new AuthService();

const formatZodErrors = (error: z.ZodError) => {
  const flattened = error.flatten();
  return {
    fieldErrors: flattened.fieldErrors,
    formErrors: flattened.formErrors,
  };
};

const toSafeUser = (user: any) => {
  const userObject =
    user && typeof user.toObject === "function" ? user.toObject() : user || {};
  const { password, document, ...safeUser } = userObject;

  return {
    ...safeUser,
    document: document
      ? {
          documentType: document.documentType,
          originalName: document.originalName,
          mimeType: document.mimeType,
          size: document.size,
          uploadedAt: document.uploadedAt,
          downloadAvailable: true,
        }
      : null,
  };
};

const toPublicUser = (user: any) => {
  const userObject =
    user && typeof user.toObject === "function" ? user.toObject() : user || {};
  const { password, document, ...publicUser } = userObject;
  return publicUser;
};

export class AuthController {
  async registerUser(req: Request, res: Response) {
    try {
      const parsedData = createUserDto.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: formatZodErrors(parsedData.error),
        });
      }

      const newUser = await authservice.registerUser(parsedData.data);
      return res.status(201).json(
        {
          success: true,
          data: toSafeUser(newUser),
          message: "Registered Success",
        }
      )
    } catch (error: Error | any) {
      return res.status(500).json(
        { success: false, message: error.message || "Internal Server Error" }
      )
    }
  }

  async loginUser(req: Request, res: Response) {
    try {
      const parsedData = LoginUserDto.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: formatZodErrors(parsedData.error),
        });
      }

      const { token, user } = await authservice.LoginUser(parsedData.data);
      // Exclude password from response in a safe way whether `user` is a plain object or a mongoose document
      return res.status(200).json({
        success: true,
        data: toSafeUser(user),
        token,
        message: "Login success",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async logoutUser(req: Request, res: Response) {
    try {
      // Allow logout without a token: call logout unconditionally
      await authservice.logout();

      // Clear cookie if present (no-op if cookies not configured)
      try { res.clearCookie("token"); } catch (e) {}

      return res.status(200).json({ success: true, message: "Logout successful" });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
          success: false,
          message: error.message || "Internal Server Error",
        });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const idParam = req.params.id;
      const userId = Array.isArray(idParam) ? idParam[0] : idParam;
      if (!userId) return res.status(400).json({ success: false, message: "Missing user id" });
      const {
        status: _status,
        role: _role,
        _id: _id,
        document: _document,
        ...updateData
      } = req.body || {};
      const updatedUser = await authservice.updateUser(userId, updateData);
      return res.status(200).json({
        success: true,
        data: toSafeUser(updatedUser),
        message: "User updated successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      return res.status(200).json({
        success: true,
        data: toSafeUser(req.user),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async uploadUserDocument(req: Request, res: Response) {
    const file = req.file as Express.Multer.File | undefined;

    try {
      const user = req.user as any;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No document uploaded. Use the form-data field 'document'",
        });
      }

      const updatedUser = await authservice.saveUserDocument(
        user._id.toString(),
        user.role,
        file
      );

      return res.status(200).json({
        success: true,
        data: toSafeUser(updatedUser),
        message:
          user.role === "company"
            ? "Company document uploaded successfully"
            : "Resume uploaded successfully",
      });
    } catch (error: any) {
      if (file?.path) {
        try {
          await fs.unlink(file.path);
        } catch {}
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async downloadMyDocument(req: Request, res: Response) {
    try {
      const user = req.user as any;
      const document = await authservice.getUserDocument(user._id.toString());
      return res.download(
        document.absolutePath,
        document.metadata.originalName
      );
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async downloadUserDocument(req: Request, res: Response) {
    try {
      const idParam = req.params.id;
      const userId = Array.isArray(idParam) ? idParam[0] : idParam;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "Missing user id",
        });
      }

      const document = await authservice.getUserDocument(userId);
      return res.download(
        document.absolutePath,
        document.metadata.originalName
      );
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async deleteMyDocument(req: Request, res: Response) {
    try {
      const user = req.user as any;
      const updatedUser = await authservice.deleteUserDocument(
        user._id.toString()
      );

      return res.status(200).json({
        success: true,
        data: toSafeUser(updatedUser),
        message: "Document deleted successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async updateUserStatus(req: Request, res: Response) {
    try {
      const idParam = req.params.id;
      const userId = Array.isArray(idParam) ? idParam[0] : idParam;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "Missing user id",
        });
      }

      const parsedData = UpdateUserStatusDto.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: formatZodErrors(parsedData.error),
        });
      }

      const updatedUser = await authservice.updateUserStatus(
        userId,
        parsedData.data.status
      );

      return res.status(200).json({
        success: true,
        data: toSafeUser(updatedUser),
        message: `User status updated to ${parsedData.data.status}`,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const idParam = req.params.id;
      const userId = Array.isArray(idParam) ? idParam[0] : idParam;
      if (!userId) return res.status(400).json({ success: false, message: "Missing user id" });
      const user = await authservice.getUserById(userId);
      return res.status(200).json({
        success: true,
        data: toPublicUser(user),
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }


  async uploadProfilePicture(req: Request, res: Response) {
    try {
      const idParam = req.params.id;
      const userId = Array.isArray(idParam) ? idParam[0] : idParam;
      if (!userId) return res.status(400).json({ success: false, message: "Missing user id" });

      const file = req.file as Express.Multer.File;
      if (!file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      const profileImagePath = `/uploads/${file.filename}`;

      const updatedUser = await authservice.updateProfileImage(userId, profileImagePath);

      return res.status(200).json({
        success: true,
        data: updatedUser,
        message: "Profile picture uploaded successfully",
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  async sendResetPasswordEmail(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const result = await authservice.sendResetPasswordEmail(email);

      return res.status(200).json({
        success: true,
        message: "The reset password link has been sent to your email.",
        data: result,
      });

    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }


 async resetPassword(req: Request, res: Response) {
  try {
    const tokenParam = req.params.token;
    const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
    if (!token) return res.status(400).json({ success: false, message: "Missing token" });
    const { newPassword } = req.body;

    const result = await authservice.resetPassword(token, newPassword);

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
      data: result,
    });

  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}

}
