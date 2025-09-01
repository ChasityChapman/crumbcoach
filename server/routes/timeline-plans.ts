import type { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { authenticateUser } from "../middleware/auth";
import { 
  timelinePlans,
  insertTimelinePlanSchema,
  type TimelinePlan 
} from "../../shared/schema";

export function setupTimelinePlansRoutes(router: Router) {
  // Get all timeline plans for authenticated user
  router.get('/api/timeline-plans', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const plans = await db.select().from(timelinePlans)
        .where(eq(timelinePlans.userId, userId))
        .orderBy(desc(timelinePlans.createdAt));
        
      res.json(plans);
    } catch (error) {
      console.error('Error fetching timeline plans:', error);
      res.status(500).json({ error: 'Failed to fetch timeline plans' });
    }
  });

  // Create new timeline plan
  router.post('/api/timeline-plans', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      const validatedData = insertTimelinePlanSchema.parse(req.body);
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
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

  // Delete timeline plan
  router.delete('/api/timeline-plans/:id', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      const planId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
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
}