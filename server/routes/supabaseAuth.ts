import type { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { authenticateUser, type AuthenticatedRequest } from "../middleware/supabaseAuth";
import { supabase, supabaseAdmin } from "../services/supabase";
import GDPRService from "../services/gdprService";
import { users, userEntitlements } from "../../shared/schema";

export function setupSupabaseAuthRoutes(router: Router) {
  // User Registration with Supabase Auth
  router.post('/api/auth/register', async (req, res) => {
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
        email_confirm: false // Auto-confirm for simplicity
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
      
      try {
        // Create user record in our database for additional data
        await db.insert(users).values({
          id: data.user.id,
          email: data.user.email || email,
          username: username || email.split('@')[0],
          firstName: firstName || '',
          lastName: lastName || '',
          password: '' // Password is handled by Supabase
        });

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
      } catch (dbError) {
        // If database operations fail, clean up the Supabase user
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        throw dbError;
      }
      
      res.status(201).json({
        user: {
          id: data.user.id,
          email: data.user.email,
          ...data.user.user_metadata
        },
        message: 'User created successfully. Please check your email to verify your account.'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        error: 'Registration service error',
        code: 'REGISTRATION_ERROR'
      });
    }
  });

  // User Login with Supabase Auth
  router.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Supabase login error:', error);
        return res.status(401).json({ 
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }
      
      if (!data.user || !data.session) {
        return res.status(401).json({ error: 'Login failed' });
      }
      
      // Log successful login
      await GDPRService.logAuditEvent(
        data.user.id,
        data.user.email || email,
        'user_login',
        'auth',
        { loginMethod: 'supabase_auth' },
        req
      );
      
      res.json({
        user: {
          id: data.user.id,
          email: data.user.email,
          ...data.user.user_metadata
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in
        },
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        error: 'Login service error',
        code: 'LOGIN_ERROR'
      });
    }
  });

  // Password Reset with Supabase Auth
  router.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Validate email format
      const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Trigger password reset with Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`
      });

      if (error) {
        console.error('Supabase password reset error:', error);
        return res.status(500).json({ 
          error: 'Failed to send password reset email',
          code: 'PASSWORD_RESET_ERROR'
        });
      }

      // Log password reset request
      await GDPRService.logAuditEvent(
        'unknown', // We don't know the user ID yet
        email,
        'password_reset_requested',
        'auth',
        { method: 'supabase_auth' },
        req,
        false // Don't require user to exist
      );
      
      res.json({ 
        message: 'If an account with that email exists, password reset instructions have been sent.',
        success: true
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ 
        error: 'Password reset service error',
        code: 'PASSWORD_RESET_SERVICE_ERROR'
      });
    }
  });

  // Update Password (when user is logged in)
  router.post('/api/auth/update-password', authenticateUser, async (req, res) => {
    try {
      const { password } = req.body;
      const user = (req as AuthenticatedRequest).user;
      
      if (!password) {
        return res.status(400).json({ 
          error: 'New password is required',
          code: 'MISSING_PASSWORD'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          error: 'Password must be at least 6 characters long',
          code: 'WEAK_PASSWORD'
        });
      }

      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get the access token from the Authorization header
      const token = req.headers.authorization?.substring(7); // Remove 'Bearer '
      
      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      // Update password in Supabase
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password }
      );

      if (error) {
        console.error('Supabase password update error:', error);
        return res.status(400).json({ 
          error: 'Failed to update password',
          code: 'PASSWORD_UPDATE_FAILED'
        });
      }

      // Log password change
      await GDPRService.logAuditEvent(
        user.id,
        user.email,
        'password_changed',
        'security',
        { method: 'authenticated_update' },
        req
      );

      res.json({
        message: 'Password updated successfully',
        success: true
      });
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({ 
        error: 'Password update service error',
        code: 'PASSWORD_UPDATE_SERVICE_ERROR'
      });
    }
  });

  // Refresh Token
  router.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refresh_token } = req.body;
      
      if (!refresh_token) {
        return res.status(400).json({ 
          error: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        });
      }
      
      // Refresh the session with Supabase
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token
      });
      
      if (error || !data.session) {
        return res.status(401).json({ 
          error: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }
      
      res.json({
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in
        },
        user: {
          id: data.user?.id,
          email: data.user?.email,
          ...data.user?.user_metadata
        },
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ 
        error: 'Token refresh service error',
        code: 'REFRESH_ERROR'
      });
    }
  });

  // Sign Out
  router.post('/api/auth/logout', authenticateUser, async (req, res) => {
    try {
      const token = req.headers.authorization?.substring(7);
      
      if (token) {
        // Sign out from Supabase (invalidates the JWT)
        const { error } = await supabase.auth.admin.signOut(token);
        
        if (error) {
          console.error('Supabase logout error:', error);
        }
      }
      
      const user = (req as AuthenticatedRequest).user;
      if (user) {
        // Log logout
        await GDPRService.logAuditEvent(
          user.id,
          user.email,
          'user_logout',
          'auth',
          { method: 'supabase_auth' },
          req
        );
      }
      
      res.json({
        message: 'Logged out successfully',
        success: true
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ 
        error: 'Logout service error',
        code: 'LOGOUT_ERROR'
      });
    }
  });

  // Account Deletion with Supabase
  router.post('/api/account/request-deletion', authenticateUser, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Request GDPR-compliant data deletion
      const deletionRequest = await GDPRService.requestDataDeletion(user.id, 'full_deletion', req);

      res.json({
        message: 'Account deletion has been requested. This will be processed within 7 days.',
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
      const deletionResult = await GDPRService.confirmDataDeletion(confirmationToken, req);

      if (!deletionResult.success) {
        return res.status(400).json({
          error: deletionResult.error || 'Invalid or expired confirmation token',
          code: 'INVALID_DELETION_TOKEN'
        });
      }

      // Delete user from Supabase Auth
      if (deletionResult.userId) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(deletionResult.userId);
        if (error) {
          console.error('Failed to delete user from Supabase:', error);
        }
      }

      res.json({
        message: 'Your account and all associated data have been permanently deleted.',
        deletedAt: deletionResult.deletedAt,
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
      const user = (req as AuthenticatedRequest).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Generate data export
      const exportData = await GDPRService.exportUserData(user.id, req);

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

  // Get Account Information
  router.get('/api/account/info', authenticateUser, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get additional user data from our database
      const [dbUser] = await db.select().from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      const [entitlements] = await db.select().from(userEntitlements)
        .where(eq(userEntitlements.userId, user.id))
        .limit(1);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          ...user,
          ...(dbUser && {
            username: dbUser.username,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName
          })
        },
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