"use strict";
// import { Request, Response, NextFunction } from 'express';
// import { UserRepository } from '../repositories/auth.repository';
// import { IUser } from '../models/user.model';
// import jwt from 'jsonwebtoken';
// import { HttpError } from '../errors/http-error';
// import { JWT_SECRET } from '../config';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizedMiddleWare = authorizedMiddleWare;
exports.adminMiddleware = adminMiddleware;
exports.companyMiddleware = companyMiddleware;
exports.verifiedUserMiddleware = verifiedUserMiddleware;
const auth_repository_1 = require("../repositories/auth.repository");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const http_error_1 = require("../errors/http-error");
const config_1 = require("../config");
let userRepository = new auth_repository_1.UserRepository();
function cleanToken(token) {
    let t = (token || "").trim();
    // remove wrapping quotes if token is like "eyJ..." or 'eyJ...'
    if ((t.startsWith('"') && t.endsWith('"')) ||
        (t.startsWith("'") && t.endsWith("'"))) {
        t = t.slice(1, -1).trim();
    }
    // if someone mistakenly sends "Bearer eyJ..." as token part
    if (t.toLowerCase().startsWith("bearer ")) {
        t = t.slice(7).trim();
    }
    return t;
}
function looksLikeJwt(token) {
    // jwt must contain exactly 2 dots: header.payload.signature
    return token.split(".").length === 3;
}
async function authorizedMiddleWare(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new http_error_1.HttpError(401, "unauthorized ,No bearer token");
        }
        // IMPORTANT:
        // If header becomes "Bearer Bearer eyJ..." then split(" ")[1] = "Bearer" (wrong)
        // So take everything after first "Bearer "
        const rawToken = authHeader.slice(7); // removes first "Bearer "
        const token = cleanToken(rawToken);
        if (!token)
            throw new http_error_1.HttpError(401, "unauthorized ,missing token");
        if (!looksLikeJwt(token))
            throw new http_error_1.HttpError(401, "Unauthorized, Invalid Token Format");
        if (!config_1.JWT_SECRET) {
            throw new http_error_1.HttpError(500, "JWT_SECRET not configured");
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET);
        if (!decoded || !decoded.id) {
            throw new http_error_1.HttpError(401, "Unauthorized, Invalid Token");
        }
        const user = await userRepository.getUserById(decoded.id);
        if (!user) {
            throw new http_error_1.HttpError(401, "Unauthorized, User Not Found");
        }
        req.user = user;
        return next();
    }
    catch (err) {
        // jwt errors should be 401 (not 500)
        if (err?.name === "JsonWebTokenError" ||
            err?.name === "TokenExpiredError" ||
            err?.name === "NotBeforeError") {
            return res.status(401).json({
                success: false,
                message: err.message || "unauthorized",
            });
        }
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "unauthorized",
        });
    }
}
async function adminMiddleware(req, res, next) {
    try {
        if (!req.user)
            throw new http_error_1.HttpError(401, "Unauthorized, User Not Found");
        // req.user is IUser or Record<string,any>
        const role = req.user.role;
        if (role !== "admin")
            throw new http_error_1.HttpError(403, "Forbidden, Admins Only");
        return next();
    }
    catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Unauthorized",
        });
    }
}
async function companyMiddleware(req, res, next) {
    try {
        if (!req.user)
            throw new http_error_1.HttpError(401, "Unauthorized, User Not Found");
        const role = req.user.role;
        if (role !== "company") {
            throw new http_error_1.HttpError(403, "Forbidden, Company Users Only");
        }
        return next();
    }
    catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Unauthorized",
        });
    }
}
async function verifiedUserMiddleware(req, res, next) {
    try {
        if (!req.user) {
            throw new http_error_1.HttpError(401, "Unauthorized, User Not Found");
        }
        const status = req.user.status || "pending";
        if (status !== "verified") {
            throw new http_error_1.HttpError(403, `Account is ${status}. Only verified accounts can perform this action`);
        }
        return next();
    }
    catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Account verification required",
        });
    }
}
