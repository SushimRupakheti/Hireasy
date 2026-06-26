"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userDocumentsDir = void 0;
exports.uploadSingleUserDocument = uploadSingleUserDocument;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = require("crypto");
exports.userDocumentsDir = path_1.default.join(process.cwd(), "uploads", "user-documents");
if (!fs_1.default.existsSync(exports.userDocumentsDir)) {
    fs_1.default.mkdirSync(exports.userDocumentsDir, { recursive: true });
}
const allowedMimeTypes = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "image/jpeg": ".jpg",
    "image/png": ".png",
};
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, callback) => callback(null, exports.userDocumentsDir),
    filename: (_req, file, callback) => {
        const extension = allowedMimeTypes[file.mimetype] ||
            path_1.default.extname(file.originalname).toLowerCase();
        callback(null, `${(0, crypto_1.randomUUID)()}${extension}`);
    },
});
const uploadUserDocument = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (_req, file, callback) => {
        if (!allowedMimeTypes[file.mimetype]) {
            return callback(new Error("Only PDF, DOC, DOCX, JPG, and PNG files are allowed"));
        }
        callback(null, true);
    },
});
function uploadSingleUserDocument(req, res, next) {
    uploadUserDocument.single("document")(req, res, (error) => {
        if (!error) {
            return next();
        }
        const message = error instanceof multer_1.default.MulterError && error.code === "LIMIT_FILE_SIZE"
            ? "Document must not exceed 5 MB"
            : error.message || "Document upload failed";
        return res.status(400).json({
            success: false,
            message,
        });
    });
}
exports.default = uploadUserDocument;
