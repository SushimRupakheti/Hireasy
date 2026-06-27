import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export const jobPhotosDir = path.join(process.cwd(), "upload", "jobs");

if (!fs.existsSync(jobPhotosDir)) {
  fs.mkdirSync(jobPhotosDir, { recursive: true });
}

const allowedMimeTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, jobPhotosDir),
  filename: (_req, file, callback) => {
    const extension =
      allowedMimeTypes[file.mimetype] ||
      path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const uploadJobPhotos = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes[file.mimetype]) {
      return callback(new Error("Only JPG, PNG, and WEBP images are allowed"));
    }

    callback(null, true);
  },
});

export function uploadMultipleJobPhotos(
  req: Request,
  res: Response,
  next: NextFunction
) {
  uploadJobPhotos.array("photos", 5)(req, res, (error: any) => {
    if (!error) {
      return next();
    }

    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "Each job photo must not exceed 5 MB"
        : error.message || "Job photo upload failed";

    return res.status(400).json({
      success: false,
      message,
    });
  });
}

export default uploadJobPhotos;
