import type { Router } from "express";
import { getHealthCheck } from "../middleware/monitoring";
import { PerformanceMonitor } from "../utils/performance";
import { runDeploymentChecks, getDeploymentSummary } from "../utils/deployment-check";

export function setupHealthRoutes(router: Router) {
  // Health check endpoint
  router.get('/api/health', (req, res) => {
    const health = getHealthCheck();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // Deployment status endpoint
  router.get('/api/deployment-status', async (req, res) => {
    try {
      const checks = await runDeploymentChecks();
      const summary = getDeploymentSummary(checks);
      
      res.json({
        status: summary.ready ? 'ready' : 'issues',
        timestamp: new Date().toISOString(),
        checks,
        summary
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Deployment check failed'
      });
    }
  });

  // Performance metrics endpoint
  router.get('/api/metrics', (req, res) => {
    const metrics = PerformanceMonitor.getMetrics();
    res.json({
      timestamp: new Date().toISOString(),
      metrics
    });
  });

  // Test endpoint
  router.get('/test', (req, res) => {
    res.json({ message: 'Server is running!', timestamp: new Date().toISOString() });
  });
}