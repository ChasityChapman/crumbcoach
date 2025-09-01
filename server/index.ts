import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { 
  requestLogger, 
  errorHandler, 
  performanceMonitor, 
  metricsCollector 
} from "./middleware/monitoring";
import {
  securityHeaders,
  apiRateLimit,
  speedLimiter,
  requestSizeLimit,
  ipFilter,
  validateRequest,
  corsOptions
} from "./middleware/security";

const app = express();

// Trust proxy for deployment environments
app.set('trust proxy', 1);

// Security middleware - applied first
app.use(securityHeaders);
app.use(ipFilter);
app.use(requestSizeLimit);

// CORS configuration
app.use(cors(corsOptions));

// Rate limiting and performance middleware
app.use('/api', apiRateLimit);
app.use('/api', speedLimiter);

// Request parsing middleware
app.use(express.json({ limit: '10mb' })); // Reduced from 50mb for security
app.use(express.urlencoded({ extended: false }));

// Request validation middleware
app.use(validateRequest);

// Monitoring middleware
app.use(requestLogger);
app.use(performanceMonitor);
app.use(metricsCollector);

// Legacy logging middleware - now replaced by enhanced requestLogger
// Keeping minimal version for backward compatibility
app.use((req, res, next) => {
  if (req.path.startsWith("/api") && process.env.NODE_ENV === 'development') {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      const logLine = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    });
  }
  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Use enhanced error handler
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
