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
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const validPassword = await comparePasswords(password, user.password);
      if (!validPassword) {
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