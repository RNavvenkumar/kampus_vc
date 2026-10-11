import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[REQUEST ERROR] [${_req.method} ${_req.url}]:`, err?.stack || err);

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

  // Handle Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    res.status(400).json({
      error: {
        code: 'INVALID_ID_FORMAT',
        message: `Invalid format for field '${err.path}': ${err.value}`
      }
    });
    return;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const details = Object.keys(err.errors || {}).map((key) => ({
      field: key,
      message: err.errors[key]?.message
    }));
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message || 'Validation failed on data model',
        details
      }
    });
    return;
  }

  // Handle MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    res.status(409).json({
      error: {
        code: 'DUPLICATE_KEY_ERROR',
        message: 'A record with duplicate unique fields already exists in the system.'
      }
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: _req.id,
      ...(err.details ? { details: err.details } : {})
    }
  });
}
