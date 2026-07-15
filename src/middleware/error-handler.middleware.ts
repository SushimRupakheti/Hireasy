import { NextFunction, Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = error?.statusCode || error?.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: error?.message || "Internal Server Error",
  });
}
