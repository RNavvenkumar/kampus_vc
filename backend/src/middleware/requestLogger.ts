import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const reqIdStr = req.id ? ` [${req.id.slice(0, 8)}]` : '';
    const logMessage = `[${new Date().toISOString()}]${reqIdStr} ${method} ${originalUrl} ${status} - ${duration}ms (${ip})`;

    if (status >= 500) {
      console.error('🔴 ' + logMessage);
    } else if (status >= 400) {
      console.warn('🟡 ' + logMessage);
    } else {
      console.log('🟢 ' + logMessage);
    }
  });

  next();
}
