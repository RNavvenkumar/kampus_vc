import crypto from 'crypto';
import { Response, Request } from 'express';
import { Session, ISession } from '../models/Session.js';
import { User, IUser } from '../models/User.js';
import { env } from '../config/env.js';
import { Types } from 'mongoose';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(
  userId: Types.ObjectId | string,
  req?: Request
): Promise<{ session: ISession; rawToken: string }> {
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);

  const ipAddress = req?.ip || req?.socket?.remoteAddress;
  const userAgent = req?.headers['user-agent'];

  const session = await Session.create({
    userId: typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
    sessionTokenHash: tokenHash,
    expiresAt,
    ipAddress,
    userAgent,
    isValid: true,
    lastActiveAt: new Date()
  });

  return { session, rawToken };
}

export async function validateSessionToken(
  rawToken: string
): Promise<{ user: IUser; session: ISession } | null> {
  if (!rawToken || typeof rawToken !== 'string') return null;

  const tokenHash = hashToken(rawToken);
  const session = await Session.findOne({
    sessionTokenHash: tokenHash,
    isValid: true,
    expiresAt: { $gt: new Date() }
  });

  if (!session) return null;

  // Touch lastActiveAt
  session.lastActiveAt = new Date();
  await session.save();

  const user = await User.findById(session.userId);
  if (!user || user.accountStatus !== 'active') return null;

  return { user, session };
}

export async function invalidateSession(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const tokenHash = hashToken(rawToken);
  const result = await Session.updateOne({ sessionTokenHash: tokenHash }, { $set: { isValid: false } });
  return result.modifiedCount > 0;
}

export async function invalidateAllUserSessions(
  userId: Types.ObjectId | string,
  exceptToken?: string
): Promise<number> {
  const filter: Record<string, unknown> = {
    userId: typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
    isValid: true
  };

  if (exceptToken) {
    filter.sessionTokenHash = { $ne: hashToken(exceptToken) };
  }

  const result = await Session.updateMany(filter, { $set: { isValid: false } });
  return result.modifiedCount;
}

export function setSessionCookie(res: Response, rawToken: string): void {
  const maxAge = env.SESSION_TTL_HOURS * 60 * 60 * 1000;
  res.cookie(env.SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}
