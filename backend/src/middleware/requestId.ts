import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.headers['x-request-id'];
  const reqId = typeof headerId === 'string' && headerId.trim() ? headerId.trim() : crypto.randomUUID();

  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}
