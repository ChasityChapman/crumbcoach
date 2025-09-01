import type { Request, Response, NextFunction } from "express";
import { JWTService, type AuthenticatedRequest } from "../services/jwt";

// Extend the Request interface to include userId and user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        userId: string;
        email: string;
        username?: string;
        firstName?: string;
        lastName?: string;
      };
    }
  }
}

// JWT Authentication middleware - replaces the old placeholder
export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required. Please provide a valid Bearer token.',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = JWTService.verifyAccessToken(token);
      
      // Attach user info to request
      req.user = payload;
      req.userId = payload.userId;
      
      next();
    } catch (jwtError: any) {
      // Handle different JWT errors with appropriate responses
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Authentication token has expired. Please login again.',
          code: 'TOKEN_EXPIRED',
          expiredAt: jwtError.expiredAt
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid authentication token.',
          code: 'INVALID_TOKEN'
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: 'Authentication service temporarily unavailable.',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

// Legacy authentication middleware - kept for backward compatibility
export const legacyAuthenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authentication token provided' });
    }

    const token = authHeader.substring(7);
    
    // Simple demo token for development
    if (token === 'demo-token') {
      req.userId = 'demo-user-id';
      next();
    } else {
      req.userId = token; // Placeholder implementation
      next();
    }
  } catch (error) {
    console.error('Legacy authentication error:', error);
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};