import type { Express } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import { requestLogger, errorHandler, getMetrics } from "./middleware/monitoring";
import { 
  authRateLimit, 
  passwordResetRateLimit, 
  registrationRateLimit 
} from "./middleware/security";

// Import route modules
import { setupHealthRoutes } from "./routes/health";
import { setupAuthRoutes } from "./routes/auth";
import { setupRecipesRoutes } from "./routes/recipes";
import { setupBakesRoutes } from "./routes/bakes";
import { setupTimelinePlansRoutes } from "./routes/timeline-plans";
import { setupStarterLogsRoutes } from "./routes/starter-logs";
import { setupTutorialsRoutes } from "./routes/tutorials";
import { setupUserEntitlementsRoutes } from "./routes/user-entitlements";
import { setupAnalyticsRoutes } from "./routes/analytics";

export function registerRoutes(app: Express): Server {
  // Create a router instance
  const router = Router();
  
  // Apply specific rate limiting to sensitive endpoints
  router.use('/api/login', authRateLimit);
  router.use('/api/register', registrationRateLimit);
  router.use('/api/forgot-password', passwordResetRateLimit);
  router.use('/api/reset-password', passwordResetRateLimit);
  
  // Register all route modules
  setupHealthRoutes(router);
  setupAuthRoutes(router);
  setupRecipesRoutes(router);
  setupBakesRoutes(router);
  setupTimelinePlansRoutes(router);
  setupStarterLogsRoutes(router);
  setupTutorialsRoutes(router);
  setupUserEntitlementsRoutes(router);
  setupAnalyticsRoutes(router);
  
  // Add metrics endpoint
  router.get('/api/metrics', (req, res) => {
    // In production, you might want to protect this endpoint
    if (process.env.NODE_ENV === 'production') {
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${process.env.METRICS_TOKEN}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
    
    res.json(getMetrics());
  });
  
  // Mount the router
  app.use('/', router);

  const httpServer = createServer(app);
  return httpServer;
}