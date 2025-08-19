import { 
  type Recipe, type InsertRecipe,
  type Bake, type InsertBake,
  type TimelineStep, type InsertTimelineStep,
  type BakeNote, type InsertBakeNote,
  type BakePhoto, type InsertBakePhoto,
  type Tutorial, type InsertTutorial,
  type SensorReading, type InsertSensorReading
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Recipes
  getRecipes(): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  
  // Bakes
  getBakes(): Promise<Bake[]>;
  getBake(id: string): Promise<Bake | undefined>;
  getActiveBake(): Promise<Bake | undefined>;
  createBake(bake: InsertBake): Promise<Bake>;
  updateBake(id: string, updates: Partial<Bake>): Promise<Bake | undefined>;
  
  // Timeline Steps
  getTimelineSteps(bakeId: string): Promise<TimelineStep[]>;
  createTimelineStep(step: InsertTimelineStep): Promise<TimelineStep>;
  updateTimelineStep(id: string, updates: Partial<TimelineStep>): Promise<TimelineStep | undefined>;
  
  // Notes
  getBakeNotes(bakeId: string): Promise<BakeNote[]>;
  createBakeNote(note: InsertBakeNote): Promise<BakeNote>;
  
  // Photos
  getBakePhotos(bakeId: string): Promise<BakePhoto[]>;
  createBakePhoto(photo: InsertBakePhoto): Promise<BakePhoto>;
  
  // Tutorials
  getTutorials(): Promise<Tutorial[]>;
  getTutorial(id: string): Promise<Tutorial | undefined>;
  
  // Sensor Readings
  getSensorReadings(bakeId?: string): Promise<SensorReading[]>;
  createSensorReading(reading: InsertSensorReading): Promise<SensorReading>;
  getLatestSensorReading(): Promise<SensorReading | undefined>;
}

export class MemStorage implements IStorage {
  private recipes: Map<string, Recipe> = new Map();
  private bakes: Map<string, Bake> = new Map();
  private timelineSteps: Map<string, TimelineStep> = new Map();
  private bakeNotes: Map<string, BakeNote> = new Map();
  private bakePhotos: Map<string, BakePhoto> = new Map();
  private tutorials: Map<string, Tutorial> = new Map();
  private sensorReadings: Map<string, SensorReading> = new Map();

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize with a default classic sourdough recipe
    const classicSourdoughId = randomUUID();
    const classicSourdough: Recipe = {
      id: classicSourdoughId,
      name: "Classic Sourdough",
      description: "Traditional sourdough bread with perfect crust and crumb",
      totalTimeHours: 24,
      difficulty: "intermediate",
      ingredients: [
        { name: "Sourdough starter", amount: "100g" },
        { name: "Bread flour", amount: "500g" },
        { name: "Water", amount: "375ml" },
        { name: "Salt", amount: "10g" }
      ],
      steps: [
        { id: "1", name: "Mix Ingredients", duration: 30, description: "Combine starter, flour, water, and salt" },
        { id: "2", name: "Bulk Fermentation", duration: 480, description: "Let dough rise with periodic folds" },
        { id: "3", name: "Shape Loaves", duration: 30, description: "Pre-shape and final shape" },
        { id: "4", name: "Final Rise", duration: 240, description: "Cold proof in refrigerator" },
        { id: "5", name: "Bake", duration: 45, description: "Bake in Dutch oven" }
      ],
      createdAt: new Date()
    };
    this.recipes.set(classicSourdoughId, classicSourdough);

    // Initialize a tutorial
    const shapingTutorialId = randomUUID();
    const shapingTutorial: Tutorial = {
      id: shapingTutorialId,
      title: "Shaping Technique",
      description: "Learn proper shaping for better rise",
      difficulty: "intermediate",
      steps: [
        { step: 1, title: "Pre-shape", description: "Form loose rounds", duration: 300 },
        { step: 2, title: "Rest", description: "Bench rest 20-30 minutes", duration: 1500 },
        { step: 3, title: "Final Shape", description: "Shape into boules or batards", duration: 600 },
        { step: 4, title: "Proof", description: "Final proofing setup", duration: 300 },
        { step: 5, title: "Score", description: "Scoring patterns and technique", duration: 180 }
      ],
      duration: 45,
      thumbnail: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73",
      createdAt: new Date()
    };
    this.tutorials.set(shapingTutorialId, shapingTutorial);
  }

  // Recipes
  async getRecipes(): Promise<Recipe[]> {
    return Array.from(this.recipes.values());
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    return this.recipes.get(id);
  }

  async createRecipe(insertRecipe: InsertRecipe): Promise<Recipe> {
    const id = randomUUID();
    const recipe: Recipe = { ...insertRecipe, id, createdAt: new Date() };
    this.recipes.set(id, recipe);
    return recipe;
  }

  // Bakes
  async getBakes(): Promise<Bake[]> {
    return Array.from(this.bakes.values());
  }

  async getBake(id: string): Promise<Bake | undefined> {
    return this.bakes.get(id);
  }

  async getActiveBake(): Promise<Bake | undefined> {
    return Array.from(this.bakes.values()).find(bake => bake.status === 'active');
  }

  async createBake(insertBake: InsertBake): Promise<Bake> {
    const id = randomUUID();
    const bake: Bake = { ...insertBake, id, createdAt: new Date() };
    this.bakes.set(id, bake);
    return bake;
  }

  async updateBake(id: string, updates: Partial<Bake>): Promise<Bake | undefined> {
    const bake = this.bakes.get(id);
    if (!bake) return undefined;
    
    const updatedBake = { ...bake, ...updates };
    this.bakes.set(id, updatedBake);
    return updatedBake;
  }

  // Timeline Steps
  async getTimelineSteps(bakeId: string): Promise<TimelineStep[]> {
    return Array.from(this.timelineSteps.values())
      .filter(step => step.bakeId === bakeId)
      .sort((a, b) => a.stepIndex - b.stepIndex);
  }

  async createTimelineStep(insertStep: InsertTimelineStep): Promise<TimelineStep> {
    const id = randomUUID();
    const step: TimelineStep = { ...insertStep, id };
    this.timelineSteps.set(id, step);
    return step;
  }

  async updateTimelineStep(id: string, updates: Partial<TimelineStep>): Promise<TimelineStep | undefined> {
    const step = this.timelineSteps.get(id);
    if (!step) return undefined;
    
    const updatedStep = { ...step, ...updates };
    this.timelineSteps.set(id, updatedStep);
    return updatedStep;
  }

  // Notes
  async getBakeNotes(bakeId: string): Promise<BakeNote[]> {
    return Array.from(this.bakeNotes.values())
      .filter(note => note.bakeId === bakeId)
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }

  async createBakeNote(insertNote: InsertBakeNote): Promise<BakeNote> {
    const id = randomUUID();
    const note: BakeNote = { ...insertNote, id, createdAt: new Date() };
    this.bakeNotes.set(id, note);
    return note;
  }

  // Photos
  async getBakePhotos(bakeId: string): Promise<BakePhoto[]> {
    return Array.from(this.bakePhotos.values())
      .filter(photo => photo.bakeId === bakeId)
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }

  async createBakePhoto(insertPhoto: InsertBakePhoto): Promise<BakePhoto> {
    const id = randomUUID();
    const photo: BakePhoto = { ...insertPhoto, id, createdAt: new Date() };
    this.bakePhotos.set(id, photo);
    return photo;
  }

  // Tutorials
  async getTutorials(): Promise<Tutorial[]> {
    return Array.from(this.tutorials.values());
  }

  async getTutorial(id: string): Promise<Tutorial | undefined> {
    return this.tutorials.get(id);
  }

  // Sensor Readings
  async getSensorReadings(bakeId?: string): Promise<SensorReading[]> {
    const readings = Array.from(this.sensorReadings.values());
    if (bakeId) {
      return readings.filter(reading => reading.bakeId === bakeId);
    }
    return readings.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }

  async createSensorReading(insertReading: InsertSensorReading): Promise<SensorReading> {
    const id = randomUUID();
    const reading: SensorReading = { ...insertReading, id, timestamp: new Date() };
    this.sensorReadings.set(id, reading);
    return reading;
  }

  async getLatestSensorReading(): Promise<SensorReading | undefined> {
    const readings = await this.getSensorReadings();
    return readings[0]; // Already sorted by timestamp desc
  }
}

export const storage = new MemStorage();
