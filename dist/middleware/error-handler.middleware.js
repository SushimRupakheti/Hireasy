"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
function notFoundHandler(req, res) {
    return res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
}
function errorHandler(error, _req, res, _next) {
    const statusCode = error?.statusCode || error?.status || 500;
    return res.status(statusCode).json({
        success: false,
        message: error?.message || "Internal Server Error",
    });
}
