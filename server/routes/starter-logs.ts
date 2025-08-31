import type { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { authenticateUser } from "../middleware/auth";
import { 
  starterLogs,
  insertStarterLogSchema,
  type StarterLog 
} from "../../shared/schema";

export function setupStarterLogsRoutes(router: Router) {
  // Get all starter logs for authenticated user
  router.get('/api/starter-logs', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const logs = await db.select().from(starterLogs)
        .where(eq(starterLogs.userId, userId))
        .orderBy(desc(starterLogs.logDate));
        
      res.json(logs);
    } catch (error) {
      console.error('Error fetching starter logs:', error);
      res.status(500).json({ error: 'Failed to fetch starter logs' });
    }
  });

  // Create new starter log
  router.post('/api/starter-logs', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const validatedData = insertStarterLogSchema.parse(req.body);
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
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

  // Update starter log
  router.patch('/api/starter-logs/:id', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const logId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
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
}