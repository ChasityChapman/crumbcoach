import type { Request, Response, NextFunction } from "express";

// Extend the Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Authentication middleware
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authentication token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // In a real app, you'd verify the JWT token here
    // For now, we'll use a simple approach
    if (token === 'demo-token') {
      req.userId = 'demo-user-id';
      next();
    } else {
      // TODO: Implement proper JWT verification with Supabase or your auth system
      // This is a placeholder implementation
      req.userId = token; // Assuming token contains user ID for now
      next();
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};