import type { Express } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import { requestLogger, errorHandler } from "./middleware/monitoring";

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
  
  // Apply middleware
  app.use(requestLogger);
  
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
  
  // Mount the router
  app.use('/', router);
  
  // Apply error handling middleware last
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}