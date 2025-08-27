import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

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
  
  // Log ALL requests 
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`🚀 API REQUEST: ${req.method} ${req.path}`);
      console.log(`🚀 Body:`, req.body);
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
      console.log('Registration data:', req.body);
      
      const { username, email, password, firstName, lastName } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check for existing user
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const userData = {
        username,
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
      };
      
      const user = await storage.createUser(userData);
      console.log('User created successfully:', { id: user.id, username: user.username, firstName: user.firstName });
      
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
      console.log('🔥 LOGIN attempt');
      
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Missing username or password" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log('User not found by username:', username);
        // Also try to find by email in case they're using email to login
        const userByEmail = await storage.getUserByEmail(username);
        if (!userByEmail) {
          console.log('User not found by email either:', username);
          return res.status(401).json({ message: "Invalid credentials" });
        }
        console.log('Found user by email instead:', userByEmail.email);
        // Use the user found by email
        const validPassword = await comparePasswords(password, userByEmail.password);
        console.log('Password comparison result (email login):', validPassword);
        
        if (!validPassword) {
          console.log('Password validation failed for email login:', username);
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
      
      console.log('Found user:', user.email, 'stored password hash length:', user.password.length);
      console.log('Attempting to compare with password:', password);
      
      const validPassword = await comparePasswords(password, user.password);
      console.log('Password comparison result:', validPassword);
      
      if (!validPassword) {
        console.log('Password validation failed for user:', username);
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
      
      console.log('Found user for password reset:', user.email, 'username:', user.username);
      
      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt,
      });
      
      console.log('Reset token generated for user:', user.email);
      
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
      console.log('Updating password for user:', user.email, 'hash length:', hashedPassword.length);
      const updateResult = await storage.updateUser(user.id, { password: hashedPassword });
      console.log('Password update result:', !!updateResult);
      
      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(resetToken.id);
      
      console.log('Password reset successful for user:', user.email);
      
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

// Middleware to check if user is authenticated
export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};

export { hashPassword, comparePasswords };