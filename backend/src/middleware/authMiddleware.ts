import { Request, Response, NextFunction } from 'express';
import { validateSessionToken } from '../services/sessionService.js';
import { IUser, UserRole } from '../models/User.js';
import { ISession } from '../models/Session.js';
import { env } from '../config/env.js';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      sessionRecord?: ISession;
      rawSessionToken?: string;
    }
  }
}

export function extractSessionToken(req: Request): string | null {
  // 1. Check HTTP-only cookie
  if (req.cookies && req.cookies[env.SESSION_COOKIE_NAME]) {
    return req.cookies[env.SESSION_COOKIE_NAME];
  }

  // 2. Check Authorization Bearer header as secondary fallback for automated testing/clients
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.method === 'OPTIONS') {
    return next();
  }
  const token = extractSessionToken(req);

  if (!token) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in to access this resource.'
      }
    });
    return;
  }

  try {
    const authResult = await validateSessionToken(token);

    if (!authResult) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid, expired, or revoked session. Please sign in again.'
        }
      });
      return;
    }

    req.user = authResult.user;
    req.sessionRecord = authResult.session;
    req.rawSessionToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'OPTIONS') {
      return next();
    }
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.'
        }
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. This action is restricted to [${allowedRoles.join(', ')}] accounts.`
        }
      });
      return;
    }

    next();
  };
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractSessionToken(req);
  if (!token) {
    return next();
  }

  try {
    const authResult = await validateSessionToken(token);
    if (authResult) {
      req.user = authResult.user;
      req.sessionRecord = authResult.session;
      req.rawSessionToken = token;
    }
  } catch {
    // Fall through gracefully for optional auth
  }

  next();
}
