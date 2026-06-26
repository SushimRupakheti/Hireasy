import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export const userDocumentsDir = path.join(
  process.cwd(),
  "uploads",
  "user-documents"
);

if (!fs.existsSync(userDocumentsDir)) {
  fs.mkdirSync(userDocumentsDir, { recursive: true });
}

const allowedMimeTypes: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, userDocumentsDir),
  filename: (_req, file, callback) => {
    const extension =
      allowedMimeTypes[file.mimetype] ||
      path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const uploadUserDocument = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes[file.mimetype]) {
      return callback(
        new Error("Only PDF, DOC, DOCX, JPG, and PNG files are allowed")
      );
    }

    callback(null, true);
  },
});

export function uploadSingleUserDocument(
  req: Request,
  res: Response,
  next: NextFunction
) {
  uploadUserDocument.single("document")(req, res, (error: any) => {
    if (!error) {
      return next();
    }

    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "Document must not exceed 5 MB"
        : error.message || "Document upload failed";

    return res.status(400).json({
      success: false,
      message,
    });
  });
}

export default uploadUserDocument;
