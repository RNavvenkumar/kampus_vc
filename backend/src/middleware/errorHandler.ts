import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or query parameters',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const message = statusCode === 500 && env.NODE_ENV === 'production'
    ? 'An unexpected internal error occurred'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: _req.id,
      ...(err.details ? { details: err.details } : {})
    }
  });
}
