import type { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { authenticateUser, type AuthenticatedRequest } from "../middleware/supabaseAuth";
import { 
  recipes,
  insertRecipeSchema,
  type Recipe 
} from "../../shared/schema";

export function setupRecipesRoutes(router: Router) {
  // Get all recipes for authenticated user
  router.get('/api/recipes', authenticateUser, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const userRecipes = await db.select().from(recipes)
        .where(eq(recipes.userId, user.id))
        .orderBy(desc(recipes.createdAt));
        
      res.json(userRecipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  });

  // Create new recipe
  router.post('/api/recipes', authenticateUser, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const validatedData = insertRecipeSchema.parse(req.body);
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const newRecipe = await db.insert(recipes).values({
        ...validatedData,
        userId: user.id
      }).returning();
      
      res.status(201).json(newRecipe[0]);
    } catch (error) {
      console.error('Error creating recipe:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create recipe' });
    }
  });

  // Update recipe
  router.put('/api/recipes/:id', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const recipeId = req.params.id;
      const validatedData = insertRecipeSchema.parse(req.body);
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // Verify ownership
      const existingRecipe = await db.select().from(recipes)
        .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
        .limit(1);
      
      if (existingRecipe.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      const updatedRecipe = await db.update(recipes)
        .set(validatedData)
        .where(eq(recipes.id, recipeId))
        .returning();
        
      res.json(updatedRecipe[0]);
    } catch (error) {
      console.error('Error updating recipe:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update recipe' });
    }
  });

  // Delete recipe
  router.delete('/api/recipes/:id', authenticateUser, async (req, res) => {
    try {
      const userId = req.userId;
      const recipeId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // Verify ownership
      const existingRecipe = await db.select().from(recipes)
        .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
        .limit(1);
      
      if (existingRecipe.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      await db.delete(recipes).where(eq(recipes.id, recipeId));
      res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      res.status(500).json({ error: 'Failed to delete recipe' });
    }
  });
}