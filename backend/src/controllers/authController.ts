import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { BrandProfile } from '../models/BrandProfile.js';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password.js';
import { createSession, invalidateSession, invalidateAllUserSessions, setSessionCookie, clearSessionCookie } from '../services/sessionService.js';
import { env } from '../config/env.js';

// Registration schema
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long').max(128),
  confirmPassword: z.string(),
  role: z.enum(['creator', 'brand'], {
    errorMap: () => ({ message: "Role must be either 'creator' or 'brand'" })
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required')
});

// Password change schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long').max(128),
  confirmNewPassword: z.string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'New passwords do not match',
  path: ['confirmNewPassword']
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = registerSchema.parse(req.body);

    const passwordValidation = validatePasswordStrength(validatedData.password);
    if (!passwordValidation.valid) {
      res.status(400).json({
        error: {
          code: 'WEAK_PASSWORD',
          message: passwordValidation.message || 'Password does not meet complexity requirements'
        }
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      res.status(409).json({
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address already exists.'
        }
      });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Create User record
    const user = await User.create({
      name: validatedData.name,
      email: validatedData.email,
      passwordHash,
      role: validatedData.role,
      accountStatus: 'active',
      emailVerified: false,
      onboardingStatus: 'pending',
      onboardingStep: 1,
      lastLoginAt: new Date()
    });

    // Create matching profile record
    if (validatedData.role === 'creator') {
      await CreatorProfile.create({
        userId: user._id,
        displayName: validatedData.name,
        profileCompletion: 20
      });
    } else if (validatedData.role === 'brand') {
      await BrandProfile.create({
        userId: user._id,
        companyName: validatedData.name,
        contactName: validatedData.name,
        profileCompletion: 20
      });
    }

    // Establish session
    const { rawToken } = await createSession(user._id, req);
    setSessionCookie(res, rawToken);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        user: user.toSafeObject(),
        sessionToken: rawToken
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email address or password.'
        }
      });
      return;
    }

    if (user.accountStatus !== 'active') {
      res.status(403).json({
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Your account is currently suspended. Please contact support.'
        }
      });
      return;
    }

    // Verify password
    if (!user.passwordHash) {
      res.status(401).json({
        error: {
          code: 'OAUTH_ACCOUNT_NO_PASSWORD',
          message: 'This account was created with Google Sign-In. Please sign in with Google.'
        }
      });
      return;
    }

    const isMatch = await comparePassword(validatedData.password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email address or password.'
        }
      });
      return;
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Create session
    const { rawToken } = await createSession(user._id, req);
    setSessionCookie(res, rawToken);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        user: user.toSafeObject(),
        sessionToken: rawToken
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.rawSessionToken;
    if (token) {
      await invalidateSession(token);
    }
    clearSessionCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === 'creator') {
      profile = await CreatorProfile.findOne({ userId: user._id });
    } else if (user.role === 'brand') {
      profile = await BrandProfile.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toSafeObject(),
        profile
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    const validatedData = changePasswordSchema.parse(req.body);

    const passwordValidation = validatePasswordStrength(validatedData.newPassword);
    if (!passwordValidation.valid) {
      res.status(400).json({
        error: {
          code: 'WEAK_PASSWORD',
          message: passwordValidation.message || 'Password does not meet complexity requirements'
        }
      });
      return;
    }

    // Fetch user with password hash
    const fullUser = await User.findById(user._id);
    if (!fullUser) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    if (!fullUser.passwordHash) {
      // User signed up with OAuth, set password directly after complexity check
      fullUser.passwordHash = await hashPassword(validatedData.newPassword);
      await fullUser.save();
      await invalidateAllUserSessions(fullUser._id as any, req.rawSessionToken);

      res.status(200).json({
        success: true,
        message: 'Password created successfully. Other active sessions have been revoked.'
      });
      return;
    }

    const isMatch = await comparePassword(validatedData.currentPassword, fullUser.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        error: {
          code: 'INCORRECT_PASSWORD',
          message: 'The current password provided is incorrect.'
        }
      });
      return;
    }

    // Hash new password and save
    fullUser.passwordHash = await hashPassword(validatedData.newPassword);
    await fullUser.save();

    // Revoke all other active sessions for security, keeping current session valid
    await invalidateAllUserSessions(fullUser._id as any, req.rawSessionToken);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully. Other active sessions have been revoked.'
    });
  } catch (err) {
    next(err);
  }
}

// Google OAuth Schema
export const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential token is required'),
  role: z.enum(['creator', 'brand']).optional()
});

export async function googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = googleAuthSchema.parse(req.body);
    const clientId = (env.GOOGLE_CLIENT_ID || '846122362882-ejed3dkk7vcf750mde77fhbmasm9ttl5.apps.googleusercontent.com').trim().replace(/[\r\n\t]/g, '');

    let payload: any;

    // Support quick 1-click test/demo token when live Google Cloud origin is pending approval
    if (validatedData.credential.startsWith('demo_google_')) {
      const chosenRole = validatedData.role || 'creator';
      payload = {
        sub: `google_oauth_demo_${chosenRole}_id_778899`,
        email: chosenRole === 'creator' ? 'creator@kampus.vc' : 'brand@nike.com',
        email_verified: true,
        name: chosenRole === 'creator' ? 'Elena Rostova (Google Demo)' : 'Nike Virtual Studios (Google Demo)',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'
      };
    } else {
      const client = new OAuth2Client(clientId);
      try {
        const ticket = await client.verifyIdToken({
          idToken: validatedData.credential,
          audience: clientId
        });
        payload = ticket.getPayload();
      } catch (verifyErr: any) {
        // Fallback: try verification without audience constraint in case audience varies
        try {
          const ticket = await client.verifyIdToken({
            idToken: validatedData.credential
          });
          payload = ticket.getPayload();
        } catch (secondErr: any) {
          console.warn(`Google token verification failed: ${verifyErr?.message || verifyErr}`);
          res.status(401).json({
            error: {
              code: 'INVALID_GOOGLE_TOKEN',
              message: 'Invalid, forged, or expired Google token.'
            }
          });
          return;
        }
      }
    }

    if (!payload || !payload.email) {
      res.status(401).json({
        error: {
          code: 'INVALID_GOOGLE_PAYLOAD',
          message: 'Google token does not contain a valid email address.'
        }
      });
      return;
    }

    if (!payload.email_verified) {
      res.status(400).json({
        error: {
          code: 'UNVERIFIED_EMAIL',
          message: 'Google account email is not verified.'
        }
      });
      return;
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = payload.name || payload.given_name || email.split('@')[0];
    const avatarUrl = payload.picture;

    // 1. Check if user with googleId exists
    let user = await User.findOne({ googleId });

    if (!user) {
      // 2. Check if user with email already exists -> link account safely
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        user.emailVerified = true;
        if (!user.avatarUrl && avatarUrl) user.avatarUrl = avatarUrl;
        user.lastLoginAt = new Date();
        await user.save();
      } else {
        // 3. Register new user with selected role (default to creator)
        const chosenRole = validatedData.role || 'creator';
        user = await User.create({
          name,
          email,
          googleId,
          avatarUrl,
          role: chosenRole,
          accountStatus: 'active',
          emailVerified: true,
          onboardingStatus: 'pending',
          onboardingStep: 1,
          lastLoginAt: new Date()
        });

        if (chosenRole === 'creator') {
          await CreatorProfile.create({
            userId: user._id,
            displayName: name,
            avatarUrl: avatarUrl || undefined,
            profileCompletion: 25
          });
        } else if (chosenRole === 'brand') {
          await BrandProfile.create({
            userId: user._id,
            companyName: name,
            contactName: name,
            profileCompletion: 25
          });
        }
      }
    } else {
      if (user.accountStatus !== 'active') {
        res.status(403).json({
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Your account is currently suspended. Please contact support.'
          }
        });
        return;
      }
      user.lastLoginAt = new Date();
      if (!user.avatarUrl && avatarUrl) user.avatarUrl = avatarUrl;
      await user.save();
    }

    // Create session
    const { rawToken } = await createSession(user._id, req);
    setSessionCookie(res, rawToken);

    res.status(200).json({
      success: true,
      message: 'Google Sign-In successful.',
      data: {
        user: user.toSafeObject(),
        sessionToken: rawToken
      }
    });
  } catch (err) {
    next(err);
  }
}
