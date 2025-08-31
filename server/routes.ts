import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import bcrypt from "bcrypt";
import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import { requestLogger, errorHandler, getHealthCheck } from "./middleware/monitoring";
import { PerformanceMonitor } from "./utils/performance";
import { runDeploymentChecks, getDeploymentSummary } from "./utils/deployment-check";
import { 
  users, 
  recipes, 
  bakes, 
  timelineSteps, 
  bakeNotes, 
  bakePhotos, 
  tutorials, 
  timelinePlans,
  starterLogs,
  userEntitlements,
  analyticsEvents,
  userSessions,
  insertUserSchema,
  insertRecipeSchema,
  insertBakeSchema,
  insertTimelineStepSchema,
  insertBakeNoteSchema,
  insertBakePhotoSchema,
  insertTimelinePlanSchema,
  insertStarterLogSchema,
  insertUserEntitlementSchema,
  insertAnalyticsEventSchema,
  insertUserSessionSchema,
  type User,
  type Recipe,
  type Bake,
  type TimelineStep,
  type BakeNote,
  type BakePhoto,
  type Tutorial,
  type TimelinePlan,
  type StarterLog,
  type UserEntitlement,
  type AnalyticsEvent,
  type UserSession
} from "../shared/schema";

// Authentication middleware
const authenticateUser = async (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Decode JWT token to extract user ID and metadata
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const userId = payload.sub;
      console.log('Authenticated user ID:', userId);
      
      // Check if user exists in our database, create or update if not
      const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (existingUser.length === 0) {
        console.log('User not found by ID, checking by email');
        const userMetadata = payload.user_metadata || {};
        const email = payload.email || userMetadata.email;
        
        // Check if a user with this email exists with a different ID
        const existingEmailUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if (existingEmailUser.length > 0) {
          console.log('User exists with different ID, updating ID to match Supabase');
          // Update the existing user's ID to match Supabase
          await db.update(users)
            .set({ id: userId })
            .where(eq(users.email, email));
        } else {
          console.log('Creating new user record');
          const newUser = await db.insert(users).values({
            id: userId, // Set to match Supabase user ID
            email: email,
            username: email?.split('@')[0] || `user_${userId.slice(0, 8)}`,
            password: 'social_auth', // Placeholder for social auth users
            firstName: userMetadata.firstName || userMetadata.first_name,
            lastName: userMetadata.lastName || userMetadata.last_name,
          }).returning();
          console.log('Created new user:', newUser[0]);
        }
      }
      
      req.userId = userId;
      next();
    } catch (decodeError) {
      console.error('Failed to decode JWT token:', decodeError);
      return res.status(401).json({ error: 'Invalid token format' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Input validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8)
});

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('=== REGISTERING ROUTES ===');
  
  // Add monitoring middleware
  app.use(requestLogger);
  
  // Enhanced health check endpoint
  app.get('/api/health', (req, res) => {
    res.json(getHealthCheck());
  });

  // Production readiness check endpoint
  app.get('/api/deployment-status', async (req, res) => {
    try {
      const checks = await runDeploymentChecks();
      const summary = getDeploymentSummary(checks);
      
      res.json({
        summary,
        checks,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to run deployment checks',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Performance metrics endpoint
  app.get('/api/metrics', (req, res) => {
    const metrics = PerformanceMonitor.getMetrics();
    res.json({
      performance: metrics,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  });

  // Test endpoint
  app.get('/test', (req, res) => {
    res.json({ message: 'Routes working', timestamp: new Date().toISOString() });
  });

  // Authentication routes
  app.post('/api/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await db.select().from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user
      const newUser = await db.insert(users).values({
        email: validatedData.email,
        username: validatedData.username,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName
      }).returning();

      const user = newUser[0];
      
      // Create default entitlements
      await db.insert(userEntitlements).values({
        userId: user.id,
        subscriptionStatus: 'free',
        entitlements: { tier: 'free' },
        revenueCatCustomerInfo: null
      });

      res.status(201).json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        } 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Registration failed' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user
      const userResults = await db.select().from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);
      
      if (userResults.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = userResults[0];
      
      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // In a real app, generate JWT token here
      const token = user.id; // Simplified for demo

      res.json({ 
        token,
        user: { 
          id: user.id, 
          email: user.email, 
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        } 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Login failed' });
    }
  });

  app.post('/api/forgot-password', async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      
      // In a real app, you'd send an email with reset link
      console.log('Password reset requested for:', validatedData.email);
      
      res.json({ message: 'Password reset email sent' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  // User management routes
  app.delete('/api/delete-account', authenticateUser, async (req, res) => {
    try {
      const { password } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Verify password before deletion
      const userResults = await db.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (userResults.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResults[0];
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Delete user (cascading deletes will handle related records)
      await db.delete(users).where(eq(users.id, userId));

      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  });

  // Recipe routes
  app.get('/api/recipes', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const userRecipes = await db.select().from(recipes)
        .where(eq(recipes.userId, userId))
        .orderBy(desc(recipes.createdAt));
      
      res.json(userRecipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  });

  app.post('/api/recipes', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const validatedData = insertRecipeSchema.parse(req.body);
      
      const newRecipe = await db.insert(recipes).values({
        ...validatedData,
        userId
      }).returning();

      res.status(201).json(newRecipe[0]);
    } catch (error) {
      console.error('Error creating recipe:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create recipe' });
    }
  });

  app.put('/api/recipes/:id', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const recipeId = req.params.id;
      const validatedData = insertRecipeSchema.parse(req.body);
      
      // Verify ownership
      const existingRecipe = await db.select().from(recipes)
        .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
        .limit(1);
      
      if (existingRecipe.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      const updatedRecipe = await db.update(recipes)
        .set(validatedData)
        .where(eq(recipes.id, recipeId))
        .returning();

      res.json(updatedRecipe[0]);
    } catch (error) {
      console.error('Error updating recipe:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update recipe' });
    }
  });

  app.delete('/api/recipes/:id', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const recipeId = req.params.id;
      
      // Verify ownership
      const existingRecipe = await db.select().from(recipes)
        .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
        .limit(1);
      
      if (existingRecipe.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      await db.delete(recipes).where(eq(recipes.id, recipeId));
      res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      res.status(500).json({ error: 'Failed to delete recipe' });
    }
  });

  // Bake routes
  app.get('/api/bakes', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const userBakes = await db.select().from(bakes)
        .where(eq(bakes.userId, userId))
        .orderBy(desc(bakes.createdAt));
      
      res.json(userBakes);
    } catch (error) {
      console.error('Error fetching bakes:', error);
      res.status(500).json({ error: 'Failed to fetch bakes' });
    }
  });

  app.post('/api/bakes', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const validatedData = insertBakeSchema.parse(req.body);
      
      const newBake = await db.insert(bakes).values({
        ...validatedData,
        userId
      }).returning();

      res.status(201).json(newBake[0]);
    } catch (error) {
      console.error('Error creating bake:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create bake' });
    }
  });

  app.patch('/api/bakes/:id', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const bakeId = req.params.id;
      
      // Verify ownership
      const existingBake = await db.select().from(bakes)
        .where(and(eq(bakes.id, bakeId), eq(bakes.userId, userId)))
        .limit(1);
      
      if (existingBake.length === 0) {
        return res.status(404).json({ error: 'Bake not found' });
      }

      const updatedBake = await db.update(bakes)
        .set(req.body)
        .where(eq(bakes.id, bakeId))
        .returning();

      res.json(updatedBake[0]);
    } catch (error) {
      console.error('Error updating bake:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update bake' });
    }
  });

  app.delete('/api/bakes/:id', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const bakeId = req.params.id;
      
      // Verify ownership
      const existingBake = await db.select().from(bakes)
        .where(and(eq(bakes.id, bakeId), eq(bakes.userId, userId)))
        .limit(1);
      
      if (existingBake.length === 0) {
        return res.status(404).json({ error: 'Bake not found' });
      }

      await db.delete(bakes).where(eq(bakes.id, bakeId));
      res.json({ message: 'Bake deleted successfully' });
    } catch (error) {
      console.error('Error deleting bake:', error);
      res.status(500).json({ error: 'Failed to delete bake' });
    }
  });

  // Timeline step routes
  app.get('/api/timeline-steps', authenticateUser, async (req, res) => {
    try {
      const { bakeId } = req.query;
      if (!bakeId) {
        return res.status(400).json({ error: 'bakeId query parameter required' });
      }

      const steps = await db.select().from(timelineSteps)
        .where(eq(timelineSteps.bakeId, bakeId as string))
        .orderBy(timelineSteps.stepIndex);
      
      res.json(steps);
    } catch (error) {
      console.error('Error fetching timeline steps:', error);
      res.status(500).json({ error: 'Failed to fetch timeline steps' });
    }
  });

  app.post('/api/timeline-steps', authenticateUser, async (req, res) => {
    try {
      const validatedData = insertTimelineStepSchema.parse(req.body);
      
      const newStep = await db.insert(timelineSteps).values(validatedData).returning();
      res.status(201).json(newStep[0]);
    } catch (error) {
      console.error('Error creating timeline step:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create timeline step' });
    }
  });

  app.patch('/api/timeline-steps/:id', authenticateUser, async (req, res) => {
    try {
      const stepId = req.params.id;
      
      const updatedStep = await db.update(timelineSteps)
        .set(req.body)
        .where(eq(timelineSteps.id, stepId))
        .returning();

      if (updatedStep.length === 0) {
        return res.status(404).json({ error: 'Timeline step not found' });
      }

      res.json(updatedStep[0]);
    } catch (error) {
      console.error('Error updating timeline step:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update timeline step' });
    }
  });

  // Timeline plan routes
  app.get('/api/timeline-plans', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const plans = await db.select().from(timelinePlans)
        .where(eq(timelinePlans.userId, userId))
        .orderBy(desc(timelinePlans.createdAt));
      
      res.json(plans);
    } catch (error) {
      console.error('Error fetching timeline plans:', error);
      res.status(500).json({ error: 'Failed to fetch timeline plans' });
    }
  });

  app.post('/api/timeline-plans', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const validatedData = insertTimelinePlanSchema.parse(req.body);
      
      const newPlan = await db.insert(timelinePlans).values({
        ...validatedData,
        userId
      }).returning();

      res.status(201).json(newPlan[0]);
    } catch (error) {
      console.error('Error creating timeline plan:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create timeline plan' });
    }
  });

  app.delete('/api/timeline-plans/:id', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const planId = req.params.id;
      
      // Verify ownership
      const existingPlan = await db.select().from(timelinePlans)
        .where(and(eq(timelinePlans.id, planId), eq(timelinePlans.userId, userId)))
        .limit(1);
      
      if (existingPlan.length === 0) {
        return res.status(404).json({ error: 'Timeline plan not found' });
      }

      await db.delete(timelinePlans).where(eq(timelinePlans.id, planId));
      res.json({ message: 'Timeline plan deleted successfully' });
    } catch (error) {
      console.error('Error deleting timeline plan:', error);
      res.status(500).json({ error: 'Failed to delete timeline plan' });
    }
  });

  // Notes routes
  app.post('/api/notes', authenticateUser, async (req, res) => {
    try {
      const validatedData = insertBakeNoteSchema.parse(req.body);
      
      const newNote = await db.insert(bakeNotes).values(validatedData).returning();
      res.status(201).json(newNote[0]);
    } catch (error) {
      console.error('Error creating note:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create note' });
    }
  });

  // Photos routes
  app.post('/api/photos', authenticateUser, async (req, res) => {
    try {
      const validatedData = insertBakePhotoSchema.parse(req.body);
      
      const newPhoto = await db.insert(bakePhotos).values(validatedData).returning();
      res.status(201).json(newPhoto[0]);
    } catch (error) {
      console.error('Error creating photo:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create photo' });
    }
  });

  // Starter logs routes
  app.get('/api/starter-logs', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const logs = await db.select().from(starterLogs)
        .where(eq(starterLogs.userId, userId))
        .orderBy(desc(starterLogs.logDate));
      
      res.json(logs);
    } catch (error) {
      console.error('Error fetching starter logs:', error);
      res.status(500).json({ error: 'Failed to fetch starter logs' });
    }
  });

  app.post('/api/starter-logs', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const validatedData = insertStarterLogSchema.parse(req.body);
      
      const newLog = await db.insert(starterLogs).values({
        ...validatedData,
        userId
      }).returning();

      res.status(201).json(newLog[0]);
    } catch (error) {
      console.error('Error creating starter log:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create starter log' });
    }
  });

  app.patch('/api/starter-logs/:id', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const logId = req.params.id;
      
      // Verify ownership
      const existingLog = await db.select().from(starterLogs)
        .where(and(eq(starterLogs.id, logId), eq(starterLogs.userId, userId)))
        .limit(1);
      
      if (existingLog.length === 0) {
        return res.status(404).json({ error: 'Starter log not found' });
      }

      const updatedLog = await db.update(starterLogs)
        .set(req.body)
        .where(eq(starterLogs.id, logId))
        .returning();

      res.json(updatedLog[0]);
    } catch (error) {
      console.error('Error updating starter log:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update starter log' });
    }
  });

  // Tutorials routes
  app.get('/api/tutorials', async (req, res) => {
    try {
      const allTutorials = await db.select().from(tutorials)
        .orderBy(tutorials.difficulty, desc(tutorials.createdAt));
      
      res.json(allTutorials);
    } catch (error) {
      console.error('Error fetching tutorials:', error);
      res.status(500).json({ error: 'Failed to fetch tutorials' });
    }
  });

  // User entitlements routes
  app.get('/api/user-entitlements', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const entitlements = await db.select().from(userEntitlements)
        .where(eq(userEntitlements.userId, userId))
        .limit(1);
      
      res.json(entitlements[0] || null);
    } catch (error) {
      console.error('Error fetching user entitlements:', error);
      res.status(500).json({ error: 'Failed to fetch user entitlements' });
    }
  });

  app.post('/api/user-entitlements', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const validatedData = insertUserEntitlementSchema.parse(req.body);
      
      // Upsert entitlements
      const existingEntitlements = await db.select().from(userEntitlements)
        .where(eq(userEntitlements.userId, userId))
        .limit(1);

      let result;
      if (existingEntitlements.length > 0) {
        result = await db.update(userEntitlements)
          .set(validatedData)
          .where(eq(userEntitlements.userId, userId))
          .returning();
      } else {
        result = await db.insert(userEntitlements).values({
          ...validatedData,
          userId
        }).returning();
      }

      res.json(result[0]);
    } catch (error) {
      console.error('Error updating user entitlements:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update user entitlements' });
    }
  });

  // Analytics routes
  app.post('/api/analytics/events', async (req, res) => {
    try {
      const validatedData = insertAnalyticsEventSchema.parse(req.body);
      
      const newEvent = await db.insert(analyticsEvents).values(validatedData).returning();
      res.status(201).json(newEvent[0]);
    } catch (error) {
      console.error('Error creating analytics event:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create analytics event' });
    }
  });

  app.post('/api/analytics/sessions', async (req, res) => {
    try {
      const validatedData = insertUserSessionSchema.parse(req.body);
      
      const newSession = await db.insert(userSessions).values(validatedData).returning();
      res.status(201).json(newSession[0]);
    } catch (error) {
      console.error('Error creating user session:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create user session' });
    }
  });

  // Add error handling middleware
  app.use(errorHandler);

  console.log('=== ROUTES REGISTERED SUCCESSFULLY ===');
  
  const server = createServer(app);
  return server;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}