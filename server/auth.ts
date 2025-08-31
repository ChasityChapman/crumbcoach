import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Initialize Supabase client for server-side use
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  console.log('=== SETTING UP PROPER AUTH WITH NAMES ===');
  
  // Log API requests WITHOUT sensitive data 
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`🚀 API REQUEST: ${req.method} ${req.path}`);
      // SECURITY: Never log request bodies as they may contain passwords, tokens, etc.
      console.log(`🚀 Body: <REDACTED - contains sensitive data>`);
    }
    next();
  });

  // Configure sessions
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Register endpoint with name capture
  app.post("/api/register", async (req, res) => {
    try {
      console.log('🔥 REGISTRATION with name capture');
      // SECURITY: Never log request body as it contains sensitive password data
      console.log('Registration attempt received');
      
      const { username, email, password, firstName, lastName } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check for existing user - allow re-registration by updating existing record
      const existingUser = await storage.getUserByUsername(username);
      const existingEmail = await storage.getUserByEmail(email);
      
      let user;
      const hashedPassword = await hashPassword(password);
      const userData = {
        username,
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
      };
      
      if (existingUser || existingEmail) {
        const userToUpdate = existingUser || existingEmail;
        if (userToUpdate) {
          console.log('User already exists, updating existing record:', userToUpdate.email);
          user = await storage.updateUser(userToUpdate.id, userData);
          if (!user) {
            throw new Error('Failed to update existing user');
          }
        } else {
          throw new Error('Unexpected error finding user to update');
        }
      } else {
        console.log('Creating new user:', username);
        user = await storage.createUser(userData);
      }
      
      console.log('User created/updated successfully:', { id: user.id, username: user.username, firstName: user.firstName });
      
      // Auto-login the user
      req.login(user, (err) => {
        if (err) {
          console.error('Auto-login failed:', err);
          return res.status(500).json({ message: "Registration succeeded but login failed" });
        }
        
        // Return user data including name
        const userResponse = {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        };
        
        console.log('Registration complete - returning user:', userResponse);
        res.status(201).json(userResponse);
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Registration failed", error: (error as Error).message });
    }
  });
  
  // Login endpoint 
  app.post("/api/login", async (req, res) => {
    try {
      console.log('🔥 LOGIN attempt received');
      
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Missing username or password" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log('User not found by primary identifier');
        // Also try to find by email in case they're using email to login
        const userByEmail = await storage.getUserByEmail(username);
        if (!userByEmail) {
          console.log('User not found by secondary identifier');
          return res.status(401).json({ message: "Invalid credentials" });
        }
        console.log('Found user by secondary identifier');
        // Use the user found by email
        const validPassword = await comparePasswords(password, userByEmail.password);
        console.log('Password verification completed for email login');
        
        if (!validPassword) {
          console.log('Password validation failed for secondary identifier login');
          return res.status(401).json({ message: "Invalid credentials" });
        }
        
        req.login(userByEmail, (err) => {
          if (err) {
            console.error('Login session error:', err);
            return res.status(500).json({ message: "Login failed" });
          }
          
          const userResponse = {
            id: userByEmail.id,
            username: userByEmail.username,
            email: userByEmail.email,
            firstName: userByEmail.firstName,
            lastName: userByEmail.lastName,
          };
          
          console.log('Login successful via email - returning user:', userResponse);
          res.json(userResponse);
        });
        return;
      }
      
      console.log('Found user, verifying credentials');
      // SECURITY: Never log raw passwords - only log that verification is being attempted
      console.log('Attempting password verification for user:', user.email);
      
      const validPassword = await comparePasswords(password, user.password);
      console.log('Password verification completed for username login');
      
      if (!validPassword) {
        console.log('Password validation failed for primary identifier login');
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error('Login session error:', err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        // Return user data including name
        const userResponse = {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        };
        
        console.log('Login successful - returning user:', userResponse);
        res.json(userResponse);
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed", error: (error as Error).message });
    }
  });
  
  // User info endpoint
  app.get("/api/user", (req, res) => {
    console.log('🔥 USER info request, authenticated:', req.isAuthenticated());
    
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as any;
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    
    console.log('Returning current user:', userResponse);
    res.json(userResponse);
  });
  
  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    console.log('🔥 LOGOUT request');
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Forgot password endpoint
  app.post("/api/forgot-password", async (req, res) => {
    try {
      console.log('🔥 FORGOT PASSWORD request');
      
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log('Email not found in database:', email);
        // Don't reveal if email exists for security
        return res.json({ 
          message: "If an account with that email exists, a reset token has been generated.",
          resetToken: null 
        });
      }
      
      console.log('Found user for password reset, generating token');
      
      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt,
      });
      
      console.log('Reset token generated successfully');
      
      res.json({ 
        message: "Password reset token generated. Copy the token below and use it on the reset password page.",
        resetToken: resetToken
      });
      
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: "Failed to process forgot password request" });
    }
  });

  // Reset password endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      console.log('🔥 RESET PASSWORD request');
      
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      // Find valid reset token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Get user
      const user = await storage.getUser(resetToken.userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      
      // Update password
      const hashedPassword = await hashPassword(newPassword);
      console.log('Updating password for user');
      const updateResult = await storage.updateUser(user.id, { password: hashedPassword });
      console.log('Password update result:', !!updateResult);
      
      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(resetToken.id);
      
      console.log('Password reset successful');
      
      res.json({ message: "Password reset successful. You can now log in with your new password." });
      
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Configure Passport serialization
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

// Middleware to verify Supabase JWT token
export const verifySupabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authorization header missing or invalid" });
    }

    if (!supabase) {
      console.error('Supabase client not initialized - missing environment variables');
      return res.status(500).json({ message: "Authentication service unavailable" });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('Supabase auth verification failed:', error?.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Find or create user in our local database
    let localUser = await storage.getUserByEmail(user.email);
    
    if (!localUser) {
      // Create user if they don't exist locally
      const newUser = {
        email: user.email,
        firstName: user.user_metadata?.firstName || user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.lastName || user.user_metadata?.last_name || '',
        username: user.email, // Use email as username for Supabase users
        password: '', // No password needed for Supabase users
      };
      
      localUser = await storage.createUser(newUser);
      console.log('Created new user from Supabase auth');
    }

    // Attach user to request object
    req.user = localUser;
    next();
  } catch (error) {
    console.error('Supabase auth middleware error:', error);
    res.status(500).json({ message: "Authentication error" });
  }
};

// Legacy middleware to check if user is authenticated (kept for backward compatibility)
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};

export { hashPassword, comparePasswords };