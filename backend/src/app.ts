import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  // Attach Correlation ID
  app.use(requestIdMiddleware);

  // Basic security headers
  app.use(helmet());

  // CORS configuration (strictly configured for credentials & explicit origins)
  const allowedOrigins = [
    env.FRONTEND_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id']
    })
  );

  // Cookie parser
  app.use(cookieParser() as any);

  // Request body parsing with sensible limits and rawBody retention for webhook verification
  app.use(
    express.json({
      limit: '2mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Request logger
  app.use(requestLogger);

  // Mount API endpoints under /api
  app.use('/api', apiRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Centralized Error handler
  app.use(errorHandler);

  return app;
}
