"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
exports.uploadSingleProfileImage = uploadSingleProfileImage;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = require("crypto");
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
const allowedImageMimeTypes = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
};
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const extension = allowedImageMimeTypes[file.mimetype] ||
            path_1.default.extname(file.originalname).toLowerCase();
        cb(null, `${(0, crypto_1.randomUUID)()}${extension}`);
    },
});
exports.upload = (0, multer_1.default)({
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
function uploadSingleProfileImage(req, res, next) {
    exports.upload.single("profileImage")(req, res, (error) => {
        if (!error) {
            return next();
        }
        const message = error instanceof multer_1.default.MulterError && error.code === "LIMIT_FILE_SIZE"
            ? "Profile picture must not exceed 5 MB"
            : error.message || "Profile picture upload failed";
        return res.status(400).json({
            success: false,
            message,
        });
    });
}
exports.default = exports.upload;
