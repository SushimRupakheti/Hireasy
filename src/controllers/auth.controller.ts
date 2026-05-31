import { AuthService } from "../services/auth.services";
import { createUserDto, LoginUserDto } from "../dtos/auth.dto";
import z from "zod";
import { Request, Response } from "express";



let authservice = new AuthService();

export class AuthController {
  async registerUser(req: Request, res: Response) {
    try {
      const parsedData = createUserDto.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json(
          { success: false, message: parsedData.error.format() }
        )
      }

      const newUser = await authservice.registerUser(parsedData.data);
      return res.status(201).json(
        { success: true, data: newUser, message: "Registered Success" }
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
          message: parsedData.error.format(),
        });
      }

      const { token, user } = await authservice.LoginUser(parsedData.data);
      // Exclude password from response in a safe way whether `user` is a plain object or a mongoose document
      const userObj: any = user && typeof (user as any).toObject === "function" ? (user as any).toObject() : user || {};
      const { password, ...userWithoutPassword } = userObj as any;
      return res.status(200).json({
        success: true,
        data: userWithoutPassword,
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
      const updateData = req.body;
      const updatedUser = await authservice.updateUser(userId, updateData);
      return res.status(200).json({
        success: true,
        data: updatedUser,
        message: "User updated successfully",
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
      return res.status(200).json({ success: true, data: user });
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