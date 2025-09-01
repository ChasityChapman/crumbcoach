import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';

/**
 * General API rate limiting
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for trusted IPs (optional)
  skip: (req: Request) => {
    const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
    return trustedIPs.includes(req.ip || '');
  }
});

/**
 * Strict rate limiting for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many authentication attempts',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Increase limit for failed attempts
  skipSuccessfulRequests: true,
});

/**
 * Rate limiting for password reset
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting for registration
 */
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: {
    error: 'Too many registration attempts',
    code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Progressive delay for repeated requests
 */
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter (v3 syntax)
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  validate: { delayMs: false }, // Disable warning
});

/**
 * Helmet security headers configuration
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.supabase.co", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API usage
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Request size limiting middleware
 */
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const maxSize = 1024 * 1024 * 10; // 10MB limit
  const contentLength = parseInt(req.get('Content-Length') || '0');
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Request entity too large',
      code: 'REQUEST_TOO_LARGE',
      maxSize: '10MB'
    });
  }
  
  next();
};

/**
 * IP whitelist/blacklist middleware
 */
export const ipFilter = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || '';
  
  // Check blacklist
  const blacklistedIPs = process.env.BLACKLISTED_IPS?.split(',').filter(Boolean) || [];
  if (blacklistedIPs.includes(clientIP)) {
    return res.status(403).json({
      error: 'Access denied from this IP address',
      code: 'IP_BLOCKED'
    });
  }
  
  // Check whitelist (if configured and not empty)
  const whitelistedIPs = process.env.WHITELISTED_IPS?.split(',').filter(Boolean) || [];
  if (whitelistedIPs.length > 0 && !whitelistedIPs.includes(clientIP)) {
    // Allow localhost IPs in development
    const localhostIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    if (process.env.NODE_ENV === 'development' && localhostIPs.includes(clientIP)) {
      return next();
    }
    
    return res.status(403).json({
      error: 'Access denied - IP not whitelisted',
      code: 'IP_NOT_WHITELISTED'
    });
  }
  
  next();
};

/**
 * Request validation middleware
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Check for common malicious patterns
  const suspiciousPatterns = [
    /(<script|<iframe|javascript:|data:text\/html)/i,
    /(union\s+select|drop\s+table|delete\s+from)/i,
    /(\.\.\/)|(\.\.\\)/,
  ];
  
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      console.warn(`Suspicious request detected from ${req.ip}:`, {
        url: req.url,
        pattern: pattern.toString(),
        userAgent: req.get('User-Agent')
      });
      
      return res.status(400).json({
        error: 'Invalid request format',
        code: 'SUSPICIOUS_REQUEST'
      });
    }
  }
  
  next();
};

/**
 * CORS configuration for production
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5000',
      'https://your-production-domain.com',
      // Add your production domains
    ];
    
    const additionalOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const allAllowedOrigins = [...allowedOrigins, ...additionalOrigins];
    
    if (allAllowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

export default {
  apiRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  registrationRateLimit,
  speedLimiter,
  securityHeaders,
  requestSizeLimit,
  ipFilter,
  validateRequest,
  corsOptions
};