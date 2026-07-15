import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const allowedImageMimeTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const extension =
      allowedImageMimeTypes[file.mimetype] ||
      path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extension}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedImageMimeTypes[file.mimetype]) {
      return cb(new Error("Only JPG, PNG, and WEBP profile pictures are allowed"));
    }

    cb(null, true);
  },
});

export function uploadSingleProfileImage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  upload.single("profileImage")(req, res, (error: any) => {
    if (!error) {
      return next();
    }

    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "Profile picture must not exceed 5 MB"
        : error.message || "Profile picture upload failed";

    return res.status(400).json({
      success: false,
      message,
    });
  });
}

export default upload;
