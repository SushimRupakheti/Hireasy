"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobPhotosDir = void 0;
exports.uploadMultipleJobPhotos = uploadMultipleJobPhotos;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = require("crypto");
exports.jobPhotosDir = path_1.default.join(process.cwd(), "upload", "jobs");
if (!fs_1.default.existsSync(exports.jobPhotosDir)) {
    fs_1.default.mkdirSync(exports.jobPhotosDir, { recursive: true });
}
const allowedMimeTypes = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
};
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, callback) => callback(null, exports.jobPhotosDir),
    filename: (_req, file, callback) => {
        const extension = allowedMimeTypes[file.mimetype] ||
            path_1.default.extname(file.originalname).toLowerCase();
        callback(null, `${(0, crypto_1.randomUUID)()}${extension}`);
    },
});
const uploadJobPhotos = (0, multer_1.default)({
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
function uploadMultipleJobPhotos(req, res, next) {
    uploadJobPhotos.array("photos", 5)(req, res, (error) => {
        if (!error) {
            return next();
        }
        const message = error instanceof multer_1.default.MulterError && error.code === "LIMIT_FILE_SIZE"
            ? "Each job photo must not exceed 5 MB"
            : error.message || "Job photo upload failed";
        return res.status(400).json({
            success: false,
            message,
        });
    });
}
exports.default = uploadJobPhotos;
