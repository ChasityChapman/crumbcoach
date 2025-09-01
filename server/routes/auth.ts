import type { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { authenticateUser } from "../middleware/auth";
import { JWTService, type AuthenticatedRequest } from "../services/jwt";
import { 
  users, 
  userEntitlements,
  insertUserSchema,
  type User 
} from "../../shared/schema";

export function setupAuthRoutes(router: Router) {
  // User Registration
  router.post('/api/register', async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await db.select().from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);
        
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const newUser = await db.insert(users).values({
        ...validatedData,
        password: hashedPassword,
      }).returning();

      // Create default entitlements
      await db.insert(userEntitlements).values({
        userId: newUser[0].id,
        subscriptionStatus: 'free',
        entitlements: { tier: 'free' },
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser[0];
      
      // Generate JWT tokens for immediate login
      const tokens = JWTService.generateTokenPair(userWithoutPassword);
      
      res.status(201).json({
        user: userWithoutPassword,
        tokens,
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create user' });
    }
  });

  // User Login
  router.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Find user
      const [user] = await db.select().from(users)
        .where(eq(users.email, email))
        .limit(1);
        
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      // Generate JWT tokens
      const tokens = JWTService.generateTokenPair(userWithoutPassword);
      
      res.json({
        user: userWithoutPassword,
        tokens,
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Login failed' });
    }
  });

  // Forgot Password
  router.post('/api/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // TODO: Implement password reset logic
      // For now, just return success
      res.json({ message: 'Password reset instructions sent to email' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to process request' });
    }
  });

  // Refresh Token
  router.post('/api/refresh-token', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ 
          error: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        });
      }
      
      try {
        const payload = JWTService.verifyRefreshToken(refreshToken);
        
        // Get user from database to ensure they still exist
        const [user] = await db.select().from(users)
          .where(eq(users.id, payload.userId))
          .limit(1);
          
        if (!user) {
          return res.status(401).json({ 
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }
        
        // Remove password from user object
        const { password: _, ...userWithoutPassword } = user;
        
        // Generate new tokens
        const tokens = JWTService.generateTokenPair(userWithoutPassword);
        
        res.json({
          tokens,
          user: userWithoutPassword,
          message: 'Tokens refreshed successfully'
        });
      } catch (jwtError: any) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Refresh token expired. Please login again.',
            code: 'REFRESH_TOKEN_EXPIRED'
          });
        } else {
          return res.status(401).json({
            error: 'Invalid refresh token',
            code: 'INVALID_REFRESH_TOKEN'
          });
        }
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ 
        error: 'Token refresh service error',
        code: 'REFRESH_ERROR'
      });
    }
  });

  // Delete Account
  router.delete('/api/delete-account', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // TODO: Implement GDPR-compliant account deletion
      // This should delete all user data across all tables
      
      const deletedUser = await db.delete(users)
        .where(eq(users.id, userId))
        .returning();
        
      if (deletedUser.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to delete account' });
    }
  });
}