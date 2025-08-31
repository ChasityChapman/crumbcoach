import type { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { authenticateUser } from "../middleware/auth";
import { 
  bakes,
  timelineSteps,
  bakeNotes,
  bakePhotos,
  insertBakeSchema,
  insertTimelineStepSchema,
  insertBakeNoteSchema,
  insertBakePhotoSchema,
  type Bake 
} from "../../shared/schema";

export function setupBakesRoutes(router: Router) {
  // Get all bakes for authenticated user
  router.get('/api/bakes', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const userBakes = await db.select().from(bakes)
        .where(eq(bakes.userId, userId))
        .orderBy(desc(bakes.createdAt));
      
      res.json(userBakes);
    } catch (error) {
      console.error('Error fetching bakes:', error);
      res.status(500).json({ error: 'Failed to fetch bakes' });
    }
  });

  // Create new bake
  router.post('/api/bakes', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const validatedData = insertBakeSchema.parse(req.body);
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const newBake = await db.insert(bakes).values({
        ...validatedData,
        userId
      }).returning();
      
      res.status(201).json(newBake[0]);
    } catch (error) {
      console.error('Error creating bake:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create bake' });
    }
  });

  // Update bake
  router.patch('/api/bakes/:id', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const bakeId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // Verify ownership
      const existingBake = await db.select().from(bakes)
        .where(and(eq(bakes.id, bakeId), eq(bakes.userId, userId)))
        .limit(1);
      
      if (existingBake.length === 0) {
        return res.status(404).json({ error: 'Bake not found' });
      }

      const updatedBake = await db.update(bakes)
        .set(req.body)
        .where(eq(bakes.id, bakeId))
        .returning();
        
      res.json(updatedBake[0]);
    } catch (error) {
      console.error('Error updating bake:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update bake' });
    }
  });

  // Delete bake
  router.delete('/api/bakes/:id', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const bakeId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // Verify ownership
      const existingBake = await db.select().from(bakes)
        .where(and(eq(bakes.id, bakeId), eq(bakes.userId, userId)))
        .limit(1);
      
      if (existingBake.length === 0) {
        return res.status(404).json({ error: 'Bake not found' });
      }
      
      await db.delete(bakes).where(eq(bakes.id, bakeId));
      res.json({ message: 'Bake deleted successfully' });
    } catch (error) {
      console.error('Error deleting bake:', error);
      res.status(500).json({ error: 'Failed to delete bake' });
    }
  });

  // Timeline Steps Routes
  router.get('/api/timeline-steps', authenticateUser, async (req, res) => {
    try {
      const { bakeId } = req.query;
      
      if (!bakeId) {
        return res.status(400).json({ error: 'bakeId is required' });
      }
      
      const steps = await db.select().from(timelineSteps)
        .where(eq(timelineSteps.bakeId, bakeId as string))
        .orderBy(timelineSteps.stepIndex);
        
      res.json(steps);
    } catch (error) {
      console.error('Error fetching timeline steps:', error);
      res.status(500).json({ error: 'Failed to fetch timeline steps' });
    }
  });

  router.post('/api/timeline-steps', authenticateUser, async (req, res) => {
    try {
      const validatedData = insertTimelineStepSchema.parse(req.body);
      
      const newStep = await db.insert(timelineSteps).values(validatedData).returning();
      res.status(201).json(newStep[0]);
    } catch (error) {
      console.error('Error creating timeline step:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create timeline step' });
    }
  });

  router.patch('/api/timeline-steps/:id', authenticateUser, async (req, res) => {
    try {
      const stepId = req.params.id;
      
      const updatedStep = await db.update(timelineSteps)
        .set(req.body)
        .where(eq(timelineSteps.id, stepId))
        .returning();
        
      if (updatedStep.length === 0) {
        return res.status(404).json({ error: 'Timeline step not found' });
      }

      res.json(updatedStep[0]);
    } catch (error) {
      console.error('Error updating timeline step:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update timeline step' });
    }
  });

  // Notes and Photos Routes
  router.post('/api/notes', authenticateUser, async (req, res) => {
    try {
      const validatedData = insertBakeNoteSchema.parse(req.body);
      
      const newNote = await db.insert(bakeNotes).values(validatedData).returning();
      res.status(201).json(newNote[0]);
    } catch (error) {
      console.error('Error creating note:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create note' });
    }
  });

  router.post('/api/photos', authenticateUser, async (req, res) => {
    try {
      const validatedData = insertBakePhotoSchema.parse(req.body);
      
      const newPhoto = await db.insert(bakePhotos).values(validatedData).returning();
      res.status(201).json(newPhoto[0]);
    } catch (error) {
      console.error('Error creating photo:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create photo' });
    }
  });
}