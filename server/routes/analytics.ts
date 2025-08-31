import type { Router } from "express";
import { db } from "../db";
import { 
  analyticsEvents,
  userSessions,
  insertAnalyticsEventSchema,
  insertUserSessionSchema,
  type AnalyticsEvent,
  type UserSession 
} from "../../shared/schema";

export function setupAnalyticsRoutes(router: Router) {
  // Track analytics events
  router.post('/api/analytics/events', async (req, res) => {
    try {
      const validatedData = insertAnalyticsEventSchema.parse(req.body);
      
      const newEvent = await db.insert(analyticsEvents).values(validatedData).returning();
      res.status(201).json(newEvent[0]);
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to track event' });
    }
  });

  // Track user sessions
  router.post('/api/analytics/sessions', async (req, res) => {
    try {
      const validatedData = insertUserSessionSchema.parse(req.body);
      
      const newSession = await db.insert(userSessions).values(validatedData).returning();
      res.status(201).json(newSession[0]);
    } catch (error) {
      console.error('Error tracking user session:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to track session' });
    }
  });
}