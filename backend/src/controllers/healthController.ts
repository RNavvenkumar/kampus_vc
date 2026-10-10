import { Request, Response } from 'express';
import { getDatabaseStatus } from '../config/database.js';
import { storageService } from '../storage/storageService.js';
import { getPaymentProvider } from '../payments/paymentFactory.js';
import { env } from '../config/env.js';

export function getHealth(req: Request, res: Response): void {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    status: 'healthy',
    requestId: req.id,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: '0.1.0',
    platform: 'Kampus.VC API Gateway',
    services: {
      server: {
        status: 'running',
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage().rss
      },
      database: dbStatus
    }
  });
}

export async function getReadiness(req: Request, res: Response): Promise<void> {
  const dbStatus = getDatabaseStatus();
  const storage = storageService.getProvider();
  const storageAvailable = await storage.isAvailable();
  const paymentProvider = getPaymentProvider();

  const isDbHealthy = dbStatus.status === 'connected';
  const isReady = isDbHealthy && storageAvailable;

  const statusCode = isReady ? 200 : (dbStatus.status === 'disabled' ? 200 : 503);

  res.status(statusCode).json({
    status: isReady ? 'ready' : (isDbHealthy ? 'degraded' : 'unhealthy'),
    requestId: req.id,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    checks: {
      database: dbStatus.status === 'connected' ? 'ok' : (dbStatus.status === 'disabled' ? 'disabled' : 'error'),
      storage: storageAvailable ? 'ok' : 'unconfigured',
      storageProvider: storage.name,
      payments: paymentProvider.providerName
    },
    databaseDetails: dbStatus
  });
}

