import type { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { authenticateUser } from "../middleware/auth";
import { 
  userEntitlements,
  insertUserEntitlementSchema,
  type UserEntitlement 
} from "../../shared/schema";

export function setupUserEntitlementsRoutes(router: Router) {
  // Get user entitlements
  router.get('/api/user-entitlements', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const entitlements = await db.select().from(userEntitlements)
        .where(eq(userEntitlements.userId, userId))
        .limit(1);
        
      res.json(entitlements[0] || null);
    } catch (error) {
      console.error('Error fetching user entitlements:', error);
      res.status(500).json({ error: 'Failed to fetch user entitlements' });
    }
  });

  // Create or update user entitlements
  router.post('/api/user-entitlements', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      const validatedData = insertUserEntitlementSchema.parse(req.body);
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
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
}