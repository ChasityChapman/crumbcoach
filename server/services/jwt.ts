import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface JWTPayload {
  userId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  userId?: string;
}

// Environment variables with fallbacks
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export class JWTService {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
      issuer: 'crumbcoach',
      audience: 'crumbcoach-app',
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: { userId: string, tokenVersion?: number }): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRY,
      issuer: 'crumbcoach',
      audience: 'crumbcoach-app',
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(user: {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }, tokenVersion = 0) {
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    const refreshToken = this.generateRefreshToken({
      userId: user.id,
      tokenVersion,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRY,
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'crumbcoach',
      audience: 'crumbcoach-app',
    }) as JWTPayload;
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): { userId: string; tokenVersion?: number } {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'crumbcoach',
      audience: 'crumbcoach-app',
    }) as { userId: string; tokenVersion?: number };
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
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
      // Handle different JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
          expiredAt: jwtError.expiredAt
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    console.error('JWT authentication error:', error);
    res.status(500).json({
      error: 'Authentication service error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const payload = JWTService.verifyAccessToken(token);
      req.user = payload;
      req.userId = payload.userId;
    } catch (error) {
      // Silently fail for optional auth
      console.warn('Optional JWT validation failed:', error);
    }
  }
  
  next();
};

/**
 * Role-based authorization middleware
 */
export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_AUTH'
      });
    }

    // For now, we'll implement basic role checking
    // In a full implementation, you'd check user roles from database
    const userRole = 'user'; // Default role
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

export default JWTService;