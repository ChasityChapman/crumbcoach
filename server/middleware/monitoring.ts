import type { Request, Response, NextFunction } from 'express';

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, ip } = req;
    const { statusCode } = res;
    
    // Enhanced logging for production monitoring
    console.log(JSON.stringify({
      timestamp,
      method,
      url,
      statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: ip || req.connection?.remoteAddress,
      contentLength: res.get('Content-Length') || 0
    }));
  });

  next();
};

// Error tracking middleware
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log detailed error information
  console.error(JSON.stringify({
    errorId,
    timestamp,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection?.remoteAddress
  }));

  // Return safe error response
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || error.statusCode || 500;
  
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : error.message,
    errorId: process.env.NODE_ENV === 'production' ? errorId : undefined,
    timestamp
  });
};

// Health check endpoint data
export const getHealthCheck = () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    },
    database: {
      connected: true // In a real app, you'd check actual DB connection
    }
  };
};