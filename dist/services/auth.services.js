"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const auth_repository_1 = require("../repositories/auth.repository");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const http_error_1 = require("../errors/http-error");
const config_1 = require("../config");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../models/user.model");
const email_1 = require("../config/email");
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const upload_user_document_1 = require("../middlewares/upload-user-document");
dotenv_1.default.config();
const CLIENT_URL = process.env.CLIENT_URL;
let userRepository = new auth_repository_1.UserRepository();
class AuthService {
    async registerUser(data) {
        //logic to register user,duplicate check, hash
        const emailExists = await userRepository.getUserByEmail(data.email);
        if (emailExists) {
            throw new http_error_1.HttpError(409, "email already registered");
        }
        //donot save plain text password, hash the pass
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 10); //complexity
        const newUser = await userRepository.createUser({
            ...data,
            password: hashedPassword,
            status: "pending",
        });
        return newUser;
    }
    async LoginUser(data) {
        const user = await userRepository.getUserByEmail(data.email);
        if (!user) {
            throw new http_error_1.HttpError(404, "user not found");
        }
        const validPassword = await bcryptjs_1.default.compare(data.password, user.password);
        //plain text, hased, not data.password===user.passwprd
        if (!validPassword) {
            throw new http_error_1.HttpError(404, "Invalid password");
        }
        //generate jwt token 
        const payload = {
            id: user._id,
            email: user.email,
            role: user.role,
        };
        const token = jsonwebtoken_1.default.sign(payload, config_1.JWT_SECRET, { expiresIn: '30d' });
        return { token, user };
    }
    async updateUser(userId, data) {
        // Hash password if it's being updated
        if (data.password) {
            data.password = await bcryptjs_1.default.hash(data.password, 10);
        }
        const updatedUser = await userRepository.updateUserById(userId, data);
        if (!updatedUser) {
            throw new http_error_1.HttpError(404, "User not found");
        }
        return updatedUser;
    }
    async updateUserStatus(userId, status) {
        if (!mongoose_1.default.isValidObjectId(userId)) {
            throw new http_error_1.HttpError(400, "Invalid user id");
        }
        const updatedUser = await userRepository.updateUserById(userId, { status });
        if (!updatedUser) {
            throw new http_error_1.HttpError(404, "User not found");
        }
        return updatedUser;
    }
    async saveUserDocument(userId, role, file) {
        if (!mongoose_1.default.isValidObjectId(userId)) {
            throw new http_error_1.HttpError(400, "Invalid user id");
        }
        if (!["user", "company"].includes(role)) {
            throw new http_error_1.HttpError(403, "Only workers and companies can upload documents");
        }
        const existingUser = await userRepository.getUserById(userId);
        if (!existingUser) {
            throw new http_error_1.HttpError(404, "User not found");
        }
        const oldFilename = existingUser.document?.filename;
        const document = {
            documentType: role === "company" ? "company_document" : "resume",
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedAt: new Date(),
        };
        const updatedUser = await userRepository.updateUserById(userId, {
            document,
        });
        if (!updatedUser) {
            throw new http_error_1.HttpError(404, "User not found");
        }
        if (oldFilename && oldFilename !== file.filename) {
            await this.removeDocumentFile(oldFilename);
        }
        return updatedUser;
    }
    async deleteUserDocument(userId) {
        if (!mongoose_1.default.isValidObjectId(userId)) {
            throw new http_error_1.HttpError(400, "Invalid user id");
        }
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new http_error_1.HttpError(404, "User not found");
        }
        if (!user.document) {
            throw new http_error_1.HttpError(404, "No document found");
        }
        const filename = user.document.filename;
        const updatedUser = await userRepository.updateUserById(userId, {
            document: null,
        });
        await this.removeDocumentFile(filename);
        return updatedUser;
    }
    async getUserDocument(userId) {
        if (!mongoose_1.default.isValidObjectId(userId)) {
            throw new http_error_1.HttpError(400, "Invalid user id");
        }
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new http_error_1.HttpError(404, "User not found");
        }
        if (!user.document) {
            throw new http_error_1.HttpError(404, "No document found");
        }
        const safeFilename = path_1.default.basename(user.document.filename);
        const absolutePath = path_1.default.join(upload_user_document_1.userDocumentsDir, safeFilename);
        try {
            await promises_1.default.access(absolutePath);
        }
        catch {
            throw new http_error_1.HttpError(404, "Document file not found");
        }
        return {
            metadata: user.document,
            absolutePath,
        };
    }
    async removeDocumentFile(filename) {
        const safeFilename = path_1.default.basename(filename);
        try {
            await promises_1.default.unlink(path_1.default.join(upload_user_document_1.userDocumentsDir, safeFilename));
        }
        catch (error) {
            if (error?.code !== "ENOENT") {
                throw error;
            }
        }
    }
    async updateProfileImage(userId, imagePath) {
        const user = await user_model_1.UserModel.findByIdAndUpdate(userId, { profileImage: imagePath }, { new: true });
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
    async getUserById(userId) {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new http_error_1.HttpError(404, "User not found");
        }
        return user;
    }
    async sendResetPasswordEmail(email) {
        if (!email) {
            throw new http_error_1.HttpError(400, "Email is required");
        }
        const user = await userRepository.getUserByEmail(email);
        if (!user) {
            throw new http_error_1.HttpError(404, "User not found");
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id }, config_1.JWT_SECRET, { expiresIn: '1h' }); // 1 hour expiry
        const resetLink = `${CLIENT_URL}/reset-password?token=${token}`;
        const html = `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>`;
        await (0, email_1.sendEmail)(user.email, "Password Reset", html);
        return user;
    }
    async resetPassword(token, newPassword) {
        try {
            if (!token || !newPassword) {
                throw new http_error_1.HttpError(400, "Token and new password are required");
            }
            const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET);
            const userId = decoded.id;
            const user = await userRepository.getUserById(userId);
            if (!user) {
                throw new http_error_1.HttpError(404, "User not found");
            }
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
            await userRepository.updateUserById(userId, { password: hashedPassword });
            return user;
        }
        catch (error) {
            throw new http_error_1.HttpError(400, "Invalid or expired token");
        }
    }
    async logout(token) {
        // Stateless JWTs don't require server-side logout by default.
        // This stub exists to allow future token revocation/blacklisting.
        // If you store refresh tokens or maintain a blacklist, add logic here.
        return { success: true, message: "Logged out" };
    }
}
exports.AuthService = AuthService;
