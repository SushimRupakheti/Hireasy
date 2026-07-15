"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
const buckets = new Map();
function rateLimit(options) {
    return (req, res, next) => {
        const now = Date.now();
        const ip = req.ip ||
            req.socket.remoteAddress ||
            req.headers["x-forwarded-for"]?.toString() ||
            "unknown";
        const key = `${options.keyPrefix || "global"}:${ip}`;
        const current = buckets.get(key);
        if (!current || current.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + options.windowMs });
            return next();
        }
        current.count += 1;
        if (current.count > options.max) {
            return res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later.",
            });
        }
        return next();
    };
}
