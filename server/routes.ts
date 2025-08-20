import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertRecipeSchema, 
  insertBakeSchema, 
  insertTimelineStepSchema,
  insertBakeNoteSchema,
  insertBakePhotoSchema,
  insertSensorReadingSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Recipes
  app.get("/api/recipes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipes = await storage.getRecipes(userId);
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.get("/api/recipes/:id", isAuthenticated, async (req, res) => {
    try {
      const recipe = await storage.getRecipe(req.params.id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  app.post("/api/recipes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertRecipeSchema.parse({ ...req.body, userId });
      const recipe = await storage.createRecipe(validatedData);
      res.status(201).json(recipe);
    } catch (error) {
      res.status(400).json({ message: "Invalid recipe data" });
    }
  });

  // Bakes
  app.get("/api/bakes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bakes = await storage.getBakes(userId);
      res.json(bakes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bakes" });
    }
  });

  app.get("/api/bakes/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activeBake = await storage.getActiveBake(userId);
      res.json(activeBake || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active bake" });
    }
  });

  app.get("/api/bakes/:id", isAuthenticated, async (req, res) => {
    try {
      const bake = await storage.getBake(req.params.id);
      if (!bake) {
        return res.status(404).json({ message: "Bake not found" });
      }
      res.json(bake);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bake" });
    }
  });

  app.post("/api/bakes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('Received bake data:', JSON.stringify(req.body, null, 2));
      const validatedData = insertBakeSchema.parse({ ...req.body, userId });
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));
      const bake = await storage.createBake(validatedData);
      res.status(201).json(bake);
    } catch (error) {
      console.error('Bake validation error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      res.status(400).json({ message: "Invalid bake data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.patch("/api/bakes/:id", isAuthenticated, async (req, res) => {
    try {
      const bake = await storage.updateBake(req.params.id, req.body);
      if (!bake) {
        return res.status(404).json({ message: "Bake not found" });
      }
      res.json(bake);
    } catch (error) {
      res.status(500).json({ message: "Failed to update bake" });
    }
  });

  // Delete bake
  app.delete("/api/bakes/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteBake(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Bake not found" });
      }
      res.status(200).json({ message: "Bake deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete bake" });
    }
  });

  // Timeline Steps
  app.get("/api/bakes/:bakeId/timeline", isAuthenticated, async (req, res) => {
    try {
      const steps = await storage.getTimelineSteps(req.params.bakeId);
      res.json(steps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch timeline steps" });
    }
  });

  app.post("/api/timeline-steps", isAuthenticated, async (req, res) => {
    try {
      console.log('Received timeline step data:', JSON.stringify(req.body, null, 2));
      const validatedData = insertTimelineStepSchema.parse(req.body);
      console.log('Validated timeline step data:', JSON.stringify(validatedData, null, 2));
      const step = await storage.createTimelineStep(validatedData);
      res.status(201).json(step);
    } catch (error) {
      console.error('Timeline step validation error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      res.status(400).json({ message: "Invalid timeline step data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.patch("/api/timeline-steps/:id", isAuthenticated, async (req, res) => {
    try {
      console.log("Updating timeline step:", req.params.id, "with data:", JSON.stringify(req.body, null, 2));
      
      // Validate the update data using the same schema but make all fields optional
      const updateData = {
        ...req.body,
        // Convert date strings to Date objects if present
        startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
      };
      
      console.log("Processed update data:", JSON.stringify(updateData, null, 2));
      
      const step = await storage.updateTimelineStep(req.params.id, updateData);
      if (!step) {
        return res.status(404).json({ message: "Timeline step not found" });
      }
      console.log("Successfully updated timeline step:", step.id);
      res.json(step);
    } catch (error) {
      console.error("Timeline step update error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ message: "Failed to update timeline step", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Notes
  app.get("/api/bakes/:bakeId/notes", isAuthenticated, async (req, res) => {
    try {
      const notes = await storage.getBakeNotes(req.params.bakeId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post("/api/notes", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertBakeNoteSchema.parse(req.body);
      const note = await storage.createBakeNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      res.status(400).json({ message: "Invalid note data" });
    }
  });

  // Photos
  app.get("/api/bakes/:bakeId/photos", isAuthenticated, async (req, res) => {
    try {
      const photos = await storage.getBakePhotos(req.params.bakeId);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  app.post("/api/photos", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertBakePhotoSchema.parse(req.body);
      const photo = await storage.createBakePhoto(validatedData);
      res.status(201).json(photo);
    } catch (error) {
      res.status(400).json({ message: "Invalid photo data" });
    }
  });

  // Tutorials
  app.get("/api/tutorials", async (req, res) => {
    try {
      const tutorials = await storage.getTutorials();
      res.json(tutorials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tutorials" });
    }
  });

  app.get("/api/tutorials/:id", async (req, res) => {
    try {
      const tutorial = await storage.getTutorial(req.params.id);
      if (!tutorial) {
        return res.status(404).json({ message: "Tutorial not found" });
      }
      res.json(tutorial);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tutorial" });
    }
  });

  // Sensor Readings
  app.get("/api/sensors", async (req, res) => {
    try {
      const readings = await storage.getSensorReadings();
      res.json(readings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sensor readings" });
    }
  });

  app.get("/api/sensors/latest", async (req, res) => {
    try {
      const reading = await storage.getLatestSensorReading();
      res.json(reading || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch latest sensor reading" });
    }
  });

  app.post("/api/sensors", async (req, res) => {
    try {
      const validatedData = insertSensorReadingSchema.parse(req.body);
      const reading = await storage.createSensorReading(validatedData);
      res.status(201).json(reading);
    } catch (error) {
      res.status(400).json({ message: "Invalid sensor data" });
    }
  });

  // Timeline recalibration endpoint
  app.post("/api/bakes/:id/recalibrate", isAuthenticated, async (req, res) => {
    try {
      const bake = await storage.getBake(req.params.id);
      if (!bake) {
        return res.status(404).json({ message: "Bake not found" });
      }

      // Get current environmental conditions
      const latestReading = await storage.getLatestSensorReading();
      const currentTime = new Date();
      
      // Smart recalibration logic using humidity rules
      let adjustment = 0;
      let adjustmentNotes: string[] = [];
      
      if (latestReading) {
        const temp = (latestReading.temperature || 240) / 10;
        const humidity = latestReading.humidity || 65;
        
        // Temperature adjustments
        if (temp < 22) {
          const tempAdjustment = 20 + (22 - temp) * 5;
          adjustment += tempAdjustment;
          adjustmentNotes.push(`Cold temperature: +${tempAdjustment}min`);
        } else if (temp > 26) {
          const tempAdjustment = 15 + (temp - 26) * 3;
          adjustment -= tempAdjustment;
          adjustmentNotes.push(`Warm temperature: -${tempAdjustment}min`);
        }
        
        // Smart humidity adjustments
        let humidityMultiplier = 1.0;
        if (humidity >= 70) {
          humidityMultiplier = 0.85;
          adjustmentNotes.push(`Very high humidity: ×${humidityMultiplier}`);
        } else if (humidity >= 55) {
          humidityMultiplier = 0.90;
          adjustmentNotes.push(`High humidity: ×${humidityMultiplier}`);
        } else if (humidity <= 30) {
          humidityMultiplier = 1.15;
          adjustmentNotes.push(`Very low humidity: ×${humidityMultiplier}`);
        } else if (humidity <= 40) {
          humidityMultiplier = 1.10;
          adjustmentNotes.push(`Low humidity: ×${humidityMultiplier}`);
        }
        
        // Apply humidity multiplier to remaining time
        if (humidityMultiplier !== 1.0) {
          const remainingTime = Math.max(0, new Date(bake.estimatedEndTime || currentTime).getTime() - currentTime.getTime()) / 60000;
          const humidityAdjustment = remainingTime * (humidityMultiplier - 1);
          adjustment += humidityAdjustment;
        }
      } else {
        adjustmentNotes.push("No sensor data available");
      }

      // Update the bake with new estimated end time
      const currentEstimatedEnd = new Date(bake.estimatedEndTime || currentTime);
      const newEstimatedEnd = new Date(currentEstimatedEnd.getTime() + adjustment * 60000);
      
      const updatedBake = await storage.updateBake(req.params.id, {
        estimatedEndTime: newEstimatedEnd,
        timelineAdjustments: [
          ...(bake.timelineAdjustments as any[] || []),
          {
            timestamp: currentTime,
            adjustment: adjustment,
            reason: `Smart adjustments: ${adjustmentNotes.length > 0 ? adjustmentNotes.join(', ') : 'No adjustments needed'} ${latestReading ? `(${((latestReading.temperature || 240) / 10).toFixed(1)}°C, ${latestReading.humidity}% RH)` : ''}`
          }
        ]
      });

      res.json(updatedBake);
    } catch (error) {
      res.status(500).json({ message: "Failed to recalibrate timeline" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
