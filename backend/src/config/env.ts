import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or local backend
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('4000'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().optional().default('mongodb://localhost:27017/kampus-vc'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  SESSION_SECRET: z.string().default('kampus-vc-default-session-secret-change-in-production-min-32-chars'),
  SESSION_COOKIE_NAME: z.string().default('kampus_session'),
  SESSION_TTL_HOURS: z.string().regex(/^\d+$/).transform(Number).default('72'),
  COOKIE_SECURE: z.string().transform((val) => val === 'true').default('false'),

  // AI Provider configuration
  AI_PROVIDER: z.enum(['gemini', 'openai', 'mock', 'disabled']).default('disabled'),
  AI_API_KEY: z.string().optional(),
  AI_TEXT_MODEL: z.string().default('gemini-1.5-flash'),
  AI_VISION_MODEL: z.string().default('gemini-1.5-flash'),
  AI_REQUEST_TIMEOUT_MS: z.string().regex(/^\d+$/).transform(Number).default('30000'),
  AI_MAX_OUTPUT_TOKENS: z.string().regex(/^\d+$/).transform(Number).default('4096'),
  AI_DAILY_USER_LIMIT: z.string().regex(/^\d+$/).transform(Number).default('50'),

  // Google OAuth 2.0
  GOOGLE_CLIENT_ID: z.string().default('846122362882-ejed3dkk7vcf750mde77fhbmasm9ttl5.apps.googleusercontent.com').transform((val) => val.trim().replace(/[\r\n\t]/g, '')),
  GOOGLE_CLIENT_SECRET: z.string().optional().transform((val) => val?.trim().replace(/[\r\n\t]/g, '')),

  // Media Object Storage (Phase 7 & Cloudinary)
  MEDIA_STORAGE_PROVIDER: z.enum(['local', 's3', 'cloudinary']).default('local'),
  MEDIA_STORAGE_LOCAL_DIR: z.string().default('uploads'),
  MEDIA_BUCKET: z.string().optional(),
  MEDIA_REGION: z.string().default('us-east-1'),
  MEDIA_ENDPOINT: z.string().optional(),
  MEDIA_ACCESS_KEY_ID: z.string().optional(),
  MEDIA_SECRET_ACCESS_KEY: z.string().optional(),
  MEDIA_PUBLIC_BASE_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  MEDIA_MAX_IMAGE_BYTES: z.string().regex(/^\d+$/).transform(Number).default('26214400'), // 25 MB
  MEDIA_MAX_VIDEO_BYTES: z.string().regex(/^\d+$/).transform(Number).default('262144000'), // 250 MB
  MEDIA_UPLOAD_URL_TTL_SECONDS: z.string().regex(/^\d+$/).transform(Number).default('900'), // 15 mins
  MEDIA_DOWNLOAD_URL_TTL_SECONDS: z.string().regex(/^\d+$/).transform(Number).default('3600'), // 1 hour

  // Payment Integration (Phase 9)
  PAYMENT_PROVIDER: z.enum(['razorpay', 'mock']).default('razorpay'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_ENVIRONMENT: z.enum(['test', 'live']).default('test')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment configuration error:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
