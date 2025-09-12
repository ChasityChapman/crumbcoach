import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

// Placeholder monitoring service - replace with your actual service (DataDog, New Relic, etc.)
const sendToMonitoringService = async (alertData: any) => {
  try {
    // Example: Send to external monitoring service
    // In a real implementation, you would send to your monitoring platform:
    // await fetch('https://api.datadoghq.com/api/v1/events', { ... });
    // await newrelic.recordCustomEvent('SecurityAlert', alertData);
    // await logstash.send(alertData);
    
    console.log('📊 MONITORING SERVICE:', JSON.stringify(alertData, null, 2));
  } catch (error) {
    console.error('Failed to send to monitoring service:', error);
  }
};

// Enhanced request logging middleware with security monitoring
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const requestId = `req_${Date.now()}_${randomBytes(6).toString('hex')}`;
  
  // Add request ID to request for tracing
  (req as any).requestId = requestId;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, ip } = req;
    const { statusCode } = res;
    
    // Log structure for production monitoring
    const logData = {
      requestId,
      timestamp,
      method,
      url,
      statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: ip || req.connection?.remoteAddress,
      contentLength: res.get('Content-Length') || 0,
      referer: req.get('Referer'),
      userId: (req as any).userId || null,
      // Security-relevant headers
      xForwardedFor: req.get('X-Forwarded-For'),
      xRealIp: req.get('X-Real-IP'),
    };
    
    // Color-coded console output for development
    if (process.env.NODE_ENV !== 'production') {
      const colorCode = statusCode >= 500 ? '\x1b[31m' : // Red for 5xx
                       statusCode >= 400 ? '\x1b[33m' : // Yellow for 4xx
                       statusCode >= 300 ? '\x1b[36m' : // Cyan for 3xx
                       '\x1b[32m'; // Green for 2xx
      
      console.log(`${colorCode}[${statusCode}]\x1b[0m ${method} ${url} - ${duration}ms - ${ip}`);
    }
    
    // Structured JSON logging for production
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logData));
    }
    
    // Alert on suspicious activity
    if (statusCode === 401 || statusCode === 403) {
      securityAlert({
        type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        ip,
        url,
        userAgent: req.get('User-Agent'),
        timestamp
      });
    }
    
    // Alert on server errors
    if (statusCode >= 500) {
      securityAlert({
        type: 'SERVER_ERROR',
        statusCode,
        url,
        ip,
        timestamp,
        duration
      });
    }
  });

  next();
};

// Error tracking middleware
export const errorHandler = (error: Error | unknown, req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const errorId = `err_${Date.now()}_${randomBytes(6).toString('hex')}`;
  
  // Log detailed error information
  console.error(JSON.stringify({
    errorId,
    timestamp,
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection?.remoteAddress
  }));

  // Return safe error response
  if (res.headersSent) {
    return next(error);
  }

  const status = (error && typeof error === 'object' && ('status' in error || 'statusCode' in error))
    ? (error as any).status || (error as any).statusCode || 500
    : 500;
  
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : (error instanceof Error ? error.message : 'Unknown error'),
    errorId: process.env.NODE_ENV === 'production' ? errorId : undefined,
    timestamp
  });
};

// Security alert system
export const securityAlert = (alert: {
  type: string;
  ip?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}) => {
  const alertData = {
    ...alert,
    severity: getSeverity(alert.type),
    timestamp: alert.timestamp || new Date().toISOString(),
  };
  
  // Log security alerts
  console.warn('🚨 SECURITY ALERT:', JSON.stringify(alertData));
  
  // In production, you might want to:
  // - Send to monitoring service (DataDog, New Relic, etc.)
  // - Send email/Slack notifications for critical alerts
  // - Store in security events database
  
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to external monitoring service
    sendToMonitoringService(alertData);
  }
};

// Determine alert severity
const getSeverity = (alertType: string): 'low' | 'medium' | 'high' | 'critical' => {
  const severityMap: { [key: string]: 'low' | 'medium' | 'high' | 'critical' } = {
    'UNAUTHORIZED_ACCESS_ATTEMPT': 'medium',
    'SERVER_ERROR': 'high',
    'RATE_LIMIT_EXCEEDED': 'medium',
    'SUSPICIOUS_REQUEST': 'high',
    'AUTH_FAILURE': 'medium',
    'DATA_BREACH_ATTEMPT': 'critical'
  };
  
  return severityMap[alertType] || 'low';
};

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = {
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external,
    };
    
    // Log performance metrics for slow requests
    if (duration > 1000) { // Requests taking more than 1 second
      console.warn('⚡ SLOW REQUEST:', {
        url: req.url,
        method: req.method,
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta,
        timestamp: new Date().toISOString()
      });
    }
    
    // Track memory leaks
    if (memoryDelta.heapUsed > 50 * 1024 * 1024) { // More than 50MB increase
      console.warn('💾 HIGH MEMORY USAGE:', {
        url: req.url,
        memoryIncrease: `${Math.round(memoryDelta.heapUsed / 1024 / 1024)}MB`,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  next();
};

// Enhanced health check endpoint data
export const getHealthCheck = () => {
  const memUsage = process.memoryUsage();
  const loadAverage = process.platform === 'linux' ? require('os').loadavg() : [0, 0, 0];
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    uptime: Math.floor(process.uptime()),
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
    },
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
    },
    load: loadAverage,
    database: {
      connected: true, // In a real app, you'd check actual DB connection
      // You might add connection pool stats, query performance, etc.
    },
    services: {
      jwt: true,
      supabase: !!process.env.VITE_SUPABASE_URL,
      // Add other service health checks
    }
  };
};

// Request metrics collector
interface RequestMetrics {
  totalRequests: number;
  requestsByStatus: { [key: number]: number };
  averageResponseTime: number;
  responseTimes: number[];
}

const metrics: RequestMetrics = {
  totalRequests: 0,
  requestsByStatus: {},
  averageResponseTime: 0,
  responseTimes: []
};

export const metricsCollector = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Update metrics
    metrics.totalRequests++;
    metrics.requestsByStatus[res.statusCode] = (metrics.requestsByStatus[res.statusCode] || 0) + 1;
    metrics.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times for average calculation
    if (metrics.responseTimes.length > 1000) {
      metrics.responseTimes = metrics.responseTimes.slice(-1000);
    }
    
    // Calculate new average
    metrics.averageResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
  });
  
  next();
};

export const getMetrics = () => metrics;