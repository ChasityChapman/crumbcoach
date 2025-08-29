import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('=== REGISTERING ROUTES ===');
  
  // Test endpoint first
  app.get('/test', (req, res) => {
    res.json({ message: 'Routes working', timestamp: new Date().toISOString() });
  });

  const server = createServer(app);
  return server;
}
