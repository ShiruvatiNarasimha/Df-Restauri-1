import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    if (req.path.startsWith('/api')) {
      const log = {
        method: req.method,
        path: req.path,
        status,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip
      };

      if (status >= 400 || duration > 1000) {
        console.error('[API Error]', log);
      } else {
        console.log('[API Request]', log);
      }
    }
  });

  next();
};
