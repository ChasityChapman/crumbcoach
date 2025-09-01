import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';
import type { User } from '../../shared/schema';

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

/**
 * Middleware to authenticate requests using Supabase Auth
 */
export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid authorization header',
        code: 'MISSING_AUTH_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Attach user info to request object
    req.user = {
      id: user.id,
      username: user.user_metadata?.username || user.email?.split('@')[0] || '',
      email: user.email || '',
      password: '', // Not available from Supabase auth
      firstName: user.user_metadata?.firstName || null,
      lastName: user.user_metadata?.lastName || null,
      profileImageUrl: user.user_metadata?.avatar_url || null,
      createdAt: user.created_at ? new Date(user.created_at) : null,
      updatedAt: user.updated_at ? new Date(user.updated_at) : null,
    } as User;
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user info
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = {
        id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || '',
        email: user.email || '',
        password: '', // Not available from Supabase auth
        firstName: user.user_metadata?.firstName || null,
        lastName: user.user_metadata?.lastName || null,
        profileImageUrl: user.user_metadata?.avatar_url || null,
        createdAt: user.created_at ? new Date(user.created_at) : null,
        updatedAt: user.updated_at ? new Date(user.updated_at) : null,
      } as User;
      req.userId = user.id;
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue even if auth fails
  }
};