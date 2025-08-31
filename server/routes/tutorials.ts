import type { Router } from "express";
import { db } from "../db";
import { 
  tutorials,
  type Tutorial 
} from "../../shared/schema";

export function setupTutorialsRoutes(router: Router) {
  // Get all tutorials (public endpoint)
  router.get('/api/tutorials', async (req, res) => {
    try {
      const allTutorials = await db.select().from(tutorials);
      res.json(allTutorials);
    } catch (error) {
      console.error('Error fetching tutorials:', error);
      res.status(500).json({ error: 'Failed to fetch tutorials' });
    }
  });
}