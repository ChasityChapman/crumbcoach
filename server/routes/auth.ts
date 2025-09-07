import type { Router } from "express";
import { z } from "zod";
import { eq, and, lt, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";
import { db } from "../db";
import { authenticateUser, type AuthenticatedRequest } from "../middleware/supabaseAuth";
import { supabase, supabaseAdmin } from "../services/supabase";
import GDPRService from "../services/gdprService";
import { emailService } from "../services/email";
import { 
  users, 
  userEntitlements,
  insertUserSchema,
  passwordResetTokens,
  type InsertPasswordResetToken
} from "../../shared/schema";
import TokenService from "../services/tokenService";
// import JWTService from "../services/jwtService"; // Not needed with Supabase auth

export function setupAuthRoutes(router: Router) {
  // User Registration with Supabase Auth
  router.post('/api/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, username } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Create user in Supabase Auth
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          firstName: firstName || '',
          lastName: lastName || '',
          username: username || email.split('@')[0]
        },
        email_confirm: false // Auto-confirm for simplicity, change to true for email verification
      });
      
      if (error) {
        console.error('Supabase registration error:', error);
        return res.status(400).json({ 
          error: error.message || 'Failed to create user account',
          code: 'REGISTRATION_FAILED'
        });
      }
      
      if (!data.user) {
        return res.status(400).json({ error: 'Failed to create user' });
      }
      
      // Create user record in our database for additional data
      const newUser = await db.insert(users).values({
        id: data.user.id, // Use Supabase user ID
        email: data.user.email || email,
        username: username || email.split('@')[0],
        firstName: firstName || '',
        lastName: lastName || '',
        password: '' // Password is handled by Supabase
      }).returning();

      // Create default entitlements
      await db.insert(userEntitlements).values({
        userId: data.user.id,
        subscriptionStatus: 'free',
        entitlements: { tier: 'free' },
      });
      
      // Log the registration for audit
      await GDPRService.logAuditEvent(
        data.user.id,
        data.user.email || email,
        'account_created',
        'auth',
        { registrationMethod: 'supabase_auth' },
        req
      );
      
      res.status(201).json({
        user: {
          id: data.user.id,
          email: data.user.email,
          ...data.user.user_metadata
        },
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        error: 'Registration service error',
        code: 'REGISTRATION_ERROR'
      });
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
      
      // Log successful login
      await GDPRService.logAuditEvent(
        user.id,
        user.email,
        'user_login',
        'auth',
        { loginMethod: 'email_password' },
        req
      );
      
      // Use Supabase session - no need for custom JWT tokens
      // Return success without custom tokens since Supabase handles this
      res.status(200).json({
        message: 'Login successful',
        user: {
          id: userWithoutPassword.id,
          email: userWithoutPassword.email,
          username: userWithoutPassword.username,
          firstName: userWithoutPassword.firstName || undefined,
          lastName: userWithoutPassword.lastName || undefined
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Login failed' });
    }
  });

  // Forgot Password - Enhanced with token generation and email
  router.post('/api/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      // Find user by email
      const [user] = await db.select().from(users)
        .where(eq(users.email, email))
        .limit(1);
        
      if (!user) {
        // For security, don't reveal if email exists
        // But log the attempt
        await GDPRService.logAuditEvent(
          'unknown',
          email,
          'password_reset_attempted',
          'security',
          { reason: 'email_not_found' },
          req,
          false
        );
        
        return res.json({ 
          message: 'If an account with that email exists, password reset instructions have been sent.',
          success: true
        });
      }

      // Clean up any existing expired tokens for this user
      await db.delete(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.userId, user.id),
          lt(passwordResetTokens.expiresAt, new Date())
        ));

      // Check for existing valid tokens (prevent spam)
      const [existingToken] = await db.select()
        .from(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt)
        ))
        .limit(1);

      if (existingToken) {
        const timeUntilExpiry = existingToken.expiresAt.getTime() - Date.now();
        if (timeUntilExpiry > 0) {
          // Rate limiting: don't allow new tokens if one exists
          return res.status(429).json({
            error: 'Password reset already requested. Please check your email or wait before requesting again.',
            retryAfter: Math.ceil(timeUntilExpiry / 1000 / 60) + ' minutes'
          });
        }
      }

      // Generate secure reset token
      const tokenData = TokenService.generatePasswordResetToken({ length: 32, expiryHours: 1 });
      
      // Store hashed token in database
      const resetTokenRecord: InsertPasswordResetToken = {
        userId: user.id,
        token: tokenData.hashedToken, // Store hash, not plain token
        expiresAt: tokenData.expiresAt
      };

      await db.insert(passwordResetTokens).values(resetTokenRecord);

      // Send password reset email
      const emailSent = await emailService.sendPasswordResetEmail({
        userEmail: user.email,
        userName: user.firstName || user.username || 'User',
        resetToken: tokenData.token, // Send plain token in email
        expiryTime: tokenData.expiresAt
      });

      // Log the attempt
      await GDPRService.logAuditEvent(
        user.id,
        user.email,
        'password_reset_requested',
        'auth',
        { emailSent, tokenGenerated: true },
        req
      );

      res.json({ 
        message: 'Password reset instructions have been sent to your email.',
        success: true,
        expiresAt: tokenData.expiresAt
      });
      
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ 
        error: 'Failed to process password reset request. Please try again later.',
        code: 'PASSWORD_RESET_ERROR'
      });
    }
  });

  // Reset Password - Complete the password reset process
  router.post('/api/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ 
          error: 'Reset token and new password are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long',
          code: 'WEAK_PASSWORD'
        });
      }

      // Find valid reset token by checking all tokens
      const resetTokens = await db.select()
        .from(passwordResetTokens)
        .where(and(
          isNull(passwordResetTokens.usedAt)
        ));

      let validTokenRecord = null;
      let userId = null;

      // Check each token to find match (timing-safe comparison)
      for (const tokenRecord of resetTokens) {
        const validation = TokenService.validateTokenWithExpiry(token, tokenRecord.token, tokenRecord.expiresAt);

        if (validation.isValid) {
          validTokenRecord = tokenRecord;
          userId = tokenRecord.userId;
          break;
        }
      }

      if (!validTokenRecord || !userId) {
        // Log invalid reset attempt
        await GDPRService.logAuditEvent(
          'unknown',
          'unknown',
          'password_reset_invalid_token',
          'security',
          { tokenProvided: !!token },
          req,
          false,
          'Invalid or expired reset token'
        );

        return res.status(400).json({
          error: 'Invalid or expired reset token',
          code: 'INVALID_RESET_TOKEN'
        });
      }

      // Get user details
      const [user] = await db.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(400).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      const [updatedUser] = await db.update(users)
        .set({ 
          password: hashedPassword, 
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(500).json({
          error: 'Failed to update password',
          code: 'UPDATE_FAILED'
        });
      }

      // Mark the reset token as used
      await db.update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, validTokenRecord.id));

      // Log successful password reset
      await GDPRService.logAuditEvent(
        userId,
        user.email,
        'password_reset_completed',
        'auth',
        { tokenUsed: validTokenRecord.id },
        req
      );

      res.json({
        message: 'Password has been reset successfully. You can now login with your new password.',
        success: true
      });

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        error: 'Failed to reset password. Please try again later.',
        code: 'RESET_ERROR'
      });
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
        // Since using Supabase auth, this should be handled client-side
        return res.status(400).json({ 
          error: 'Token refresh handled by Supabase client',
          code: 'USE_SUPABASE_REFRESH'
        });
        
        // Get user from database to ensure they still exist
        // const [user] = await db.select().from(users)
        //   .where(eq(users.id, payload.userId))
        //   .limit(1);
          
        // if (!user) {
        //   return res.status(401).json({ 
        //     error: 'User not found',
        //     code: 'USER_NOT_FOUND'
        //   });
        // }
        
        // Remove password from user object
        // const { password: _, ...userWithoutPassword } = user;
        
        // Since using Supabase auth, this endpoint is not needed
        // Unreachable code due to early return above
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

  // Request Account Deletion (GDPR-compliant)
  router.post('/api/account/request-deletion', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get user details
      const [user] = await db.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Request GDPR-compliant data deletion
      const deletionRequest = await GDPRService.requestDataDeletion(userId, 'full_deletion', req);

      // Send confirmation email
      await emailService.sendAccountDeletionEmail({
        userEmail: user.email,
        userName: user.firstName || user.username || 'User',
        deletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });

      res.json({
        message: 'Account deletion has been requested. You will receive a confirmation email with further instructions.',
        deletionToken: deletionRequest.confirmationToken,
        expiresAt: deletionRequest.expiresAt,
        success: true
      });
    } catch (error) {
      console.error('Request account deletion error:', error);
      res.status(500).json({ 
        error: 'Failed to process deletion request',
        code: 'DELETION_REQUEST_ERROR'
      });
    }
  });

  // Confirm Account Deletion
  router.post('/api/account/confirm-deletion', async (req, res) => {
    try {
      const { confirmationToken } = req.body;
      
      if (!confirmationToken) {
        return res.status(400).json({ 
          error: 'Confirmation token is required',
          code: 'MISSING_CONFIRMATION_TOKEN'
        });
      }

      // Process the deletion confirmation
      const deletionResult = await GDPRService.confirmDataDeletion(confirmationToken);

      res.json({
        message: 'Your account and all associated data have been permanently deleted.',
        deletionSummary: {
          totalRecordsDeleted: deletionResult.totalRecordsDeleted,
          recordsDeleted: deletionResult.recordsDeleted,
          dataSize: deletionResult.dataSize
        },
        success: true
      });
    } catch (error) {
      console.error('Confirm account deletion error:', error);
      res.status(500).json({ 
        error: 'Failed to confirm account deletion',
        code: 'DELETION_CONFIRMATION_ERROR'
      });
    }
  });

  // Export User Data (GDPR Right to Data Portability)
  router.get('/api/account/export-data', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Generate data export
      const exportOptions = {
        format: (req.query.format as 'json' | 'csv' | 'zip') || 'json',
        includeAnalytics: req.query.includeAnalytics !== 'false',
        includeSensors: req.query.includeSensors !== 'false',
        includePhotos: req.query.includePhotos !== 'false'
      };
      const exportData = await GDPRService.exportUserData(userId, exportOptions);

      res.json({
        message: 'Data export completed',
        exportData,
        exportedAt: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      console.error('Export user data error:', error);
      res.status(500).json({ 
        error: 'Failed to export user data',
        code: 'DATA_EXPORT_ERROR'
      });
    }
  });

  // Change Password (Authenticated)
  router.post('/api/account/change-password', authenticateUser, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          error: 'Current password and new password are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'New password must be at least 8 characters long',
          code: 'WEAK_PASSWORD'
        });
      }

      // Get current user
      const [user] = await db.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ 
          error: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await db.update(users)
        .set({ 
          password: hashedNewPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Log the password change
      await GDPRService.logAuditEvent(
        userId,
        user.email,
        'password_changed',
        'security',
        { method: 'authenticated_change' },
        req
      );

      res.json({
        message: 'Password changed successfully',
        success: true
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ 
        error: 'Failed to change password',
        code: 'PASSWORD_CHANGE_ERROR'
      });
    }
  });

  // Update Profile Information
  router.patch('/api/account/profile', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { firstName, lastName, username } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Validate input
      if (!firstName && !lastName && !username) {
        return res.status(400).json({ 
          error: 'At least one field must be provided for update',
          code: 'NO_UPDATE_FIELDS'
        });
      }

      // Check if username is already taken (if provided)
      if (username) {
        const [existingUser] = await db.select().from(users)
          .where(and(eq(users.username, username), eq(users.id, userId)))
          .limit(1);
          
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ 
            error: 'Username is already taken',
            code: 'USERNAME_TAKEN'
          });
        }
      }

      // Build update object
      const updateData: any = { updatedAt: new Date() };
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (username !== undefined) updateData.username = username;

      // Update user profile
      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;

      // Log profile update
      await GDPRService.logAuditEvent(
        userId,
        updatedUser.email,
        'profile_updated',
        'account',
        { updatedFields: Object.keys(updateData).filter(k => k !== 'updatedAt') },
        req
      );

      res.json({
        message: 'Profile updated successfully',
        user: userWithoutPassword,
        success: true
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ 
        error: 'Failed to update profile',
        code: 'PROFILE_UPDATE_ERROR'
      });
    }
  });

  // Get Account Information
  router.get('/api/account/info', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get user with entitlements
      const [user] = await db.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const [entitlements] = await db.select().from(userEntitlements)
        .where(eq(userEntitlements.userId, userId))
        .limit(1);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        user: userWithoutPassword,
        entitlements: entitlements || null,
        success: true
      });
    } catch (error) {
      console.error('Get account info error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve account information',
        code: 'ACCOUNT_INFO_ERROR'
      });
    }
  });
}