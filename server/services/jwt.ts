import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import type { User } from '../../shared/schema';

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
  user?: User;
  userId?: string;
}

// Enforce required JWT secrets - no fallbacks allowed
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required and must be set to a cryptographically secure random string (minimum 256 bits)');
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required and must be set to a different cryptographically secure random string (minimum 256 bits)');
}

const JWT_SECRET = process.env.JWT_SECRET! as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET! as string;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export class JWTService {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return (jwt.sign as any)(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
      issuer: 'crumbcoach',
      audience: 'crumbcoach-app',
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: { userId: string, tokenVersion?: number }): string {
    return (jwt.sign as any)(payload, JWT_REFRESH_SECRET, {
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

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(payload: { userId: string, email: string }): { token: string; hashedToken: string; expiresAt: Date } {
    const token = jwt.sign(payload as object, JWT_SECRET, {
      expiresIn: '1h', // Password reset tokens expire in 1 hour
      issuer: 'crumbcoach',
      audience: 'crumbcoach-app',
    });
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    return {
      token,
      hashedToken: token, // In a real implementation, you'd hash this
      expiresAt
    };
  }

  /**
   * Generate account deletion token
   */
  static generateAccountDeletionToken(payload: { userId: string, email: string }): { token: string; hashedToken: string; expiresAt: Date } {
    const token = jwt.sign(payload as object, JWT_SECRET, {
      expiresIn: '24h', // Account deletion tokens expire in 24 hours
      issuer: 'crumbcoach',
      audience: 'crumbcoach-app',
    });
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    return {
      token,
      hashedToken: token, // In a real implementation, you'd hash this
      expiresAt
    };
  }

  /**
   * Validate token with expiry check
   */
  static validateTokenWithExpiry(token: string): { isValid: boolean; userId?: string; email?: string; exp?: number; reason?: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'crumbcoach',
        audience: 'crumbcoach-app',
      }) as { userId: string; email: string; exp: number };

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return {
          isValid: false,
          reason: 'Token has expired'
        };
      }

      return {
        isValid: true,
        userId: decoded.userId,
        email: decoded.email,
        exp: decoded.exp
      };
    } catch (error) {
      return {
        isValid: false,
        reason: error instanceof Error ? error.message : 'Invalid token'
      };
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
      
      // Attach user info to request - convert JWTPayload to partial User
      req.user = {
        id: payload.userId,
        username: payload.username || '',
        email: payload.email,
        password: '', // Not included in JWT
        firstName: payload.firstName || null,
        lastName: payload.lastName || null,
        profileImageUrl: null,
        createdAt: null,
        updatedAt: null,
      } as User;
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
      req.user = {
        id: payload.userId,
        username: payload.username || '',
        email: payload.email,
        password: '', // Not included in JWT
        firstName: payload.firstName || null,
        lastName: payload.lastName || null,
        profileImageUrl: null,
        createdAt: null,
        updatedAt: null,
      } as User;
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

// Alias for backward compatibility
export const TokenService = JWTService;

export default JWTService;