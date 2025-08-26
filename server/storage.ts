import {
  users,
  recipes,
  bakes,
  timelineSteps,
  bakeNotes,
  bakePhotos,
  tutorials,
  sensorReadings,
  type User,
  type InsertUser,
  type Recipe,
  type InsertRecipe,
  type Bake,
  type InsertBake,
  type TimelineStep,
  type InsertTimelineStep,
  type BakeNote,
  type InsertBakeNote,
  type BakePhoto,
  type InsertBakePhoto,
  type Tutorial,
  type InsertTutorial,
  type SensorReading,
  type InsertSensorReading,
  passwordResetTokens,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  timelinePlans,
  type TimelinePlan,
  type InsertTimelinePlan,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, lt } from "drizzle-orm";
import { randomUUID } from "crypto";

// Interface for storage operations
export interface IStorage {
  // User operations - traditional authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined>;

  // Recipe operations
  getRecipes(userId?: string): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  updateRecipe(id: string, recipe: Partial<InsertRecipe>): Promise<Recipe | undefined>;
  deleteRecipe(id: string): Promise<boolean>;

  // Bake operations
  getBakes(userId?: string): Promise<Bake[]>;
  getBake(id: string): Promise<Bake | undefined>;
  getActiveBake(userId?: string): Promise<Bake | undefined>;
  createBake(bake: InsertBake): Promise<Bake>;
  updateBake(id: string, bake: Partial<InsertBake>): Promise<Bake | undefined>;
  deleteBake(id: string): Promise<boolean>;

  // Timeline step operations
  getTimelineSteps(bakeId: string): Promise<TimelineStep[]>;
  getTimelineStep(id: string): Promise<TimelineStep | undefined>;
  createTimelineStep(step: InsertTimelineStep): Promise<TimelineStep>;
  updateTimelineStep(id: string, step: Partial<InsertTimelineStep>): Promise<TimelineStep | undefined>;
  deleteTimelineStep(id: string): Promise<boolean>;

  // Bake note operations
  getBakeNotes(bakeId: string): Promise<BakeNote[]>;
  getBakeNote(id: string): Promise<BakeNote | undefined>;
  createBakeNote(note: InsertBakeNote): Promise<BakeNote>;
  updateBakeNote(id: string, note: Partial<InsertBakeNote>): Promise<BakeNote | undefined>;
  deleteBakeNote(id: string): Promise<boolean>;

  // Bake photo operations
  getBakePhotos(bakeId: string): Promise<BakePhoto[]>;
  getBakePhoto(id: string): Promise<BakePhoto | undefined>;
  createBakePhoto(photo: InsertBakePhoto): Promise<BakePhoto>;
  updateBakePhoto(id: string, photo: Partial<InsertBakePhoto>): Promise<BakePhoto | undefined>;
  deleteBakePhoto(id: string): Promise<boolean>;

  // Tutorial operations
  getTutorials(): Promise<Tutorial[]>;
  getTutorial(id: string): Promise<Tutorial | undefined>;
  createTutorial(tutorial: InsertTutorial): Promise<Tutorial>;
  updateTutorial(id: string, tutorial: Partial<InsertTutorial>): Promise<Tutorial | undefined>;
  deleteTutorial(id: string): Promise<boolean>;

  // Sensor reading operations
  getSensorReadings(): Promise<SensorReading[]>;
  getLatestSensorReading(): Promise<SensorReading | undefined>;
  createSensorReading(reading: InsertSensorReading): Promise<SensorReading>;

  // Password reset token operations
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(tokenId: string): Promise<boolean>;
  cleanupExpiredPasswordResetTokens(): Promise<number>;

  // Timeline plan operations
  getTimelinePlans(userId?: string): Promise<TimelinePlan[]>;
  getTimelinePlan(id: string): Promise<TimelinePlan | undefined>;
  createTimelinePlan(plan: InsertTimelinePlan): Promise<TimelinePlan>;
  updateTimelinePlan(id: string, planData: Partial<InsertTimelinePlan>): Promise<TimelinePlan | undefined>;
  deleteTimelinePlan(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations - traditional authentication
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Recipe operations
  async getRecipes(userId?: string): Promise<Recipe[]> {
    if (userId) {
      return await db.select().from(recipes).where(eq(recipes.userId, userId));
    }
    // For backwards compatibility, return all recipes if no userId provided
    return await db.select().from(recipes);
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe;
  }

  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const [newRecipe] = await db.insert(recipes).values(recipe).returning();
    return newRecipe;
  }

  async updateRecipe(id: string, recipeData: Partial<InsertRecipe>): Promise<Recipe | undefined> {
    const [updatedRecipe] = await db
      .update(recipes)
      .set(recipeData)
      .where(eq(recipes.id, id))
      .returning();
    return updatedRecipe;
  }

  async deleteRecipe(id: string): Promise<boolean> {
    const result = await db.delete(recipes).where(eq(recipes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Bake operations
  async getBakes(userId?: string): Promise<Bake[]> {
    if (userId) {
      return await db.select().from(bakes).where(eq(bakes.userId, userId)).orderBy(desc(bakes.createdAt));
    }
    // For backwards compatibility, return all bakes if no userId provided
    return await db.select().from(bakes).orderBy(desc(bakes.createdAt));
  }

  async getBake(id: string): Promise<Bake | undefined> {
    const [bake] = await db.select().from(bakes).where(eq(bakes.id, id));
    return bake;
  }

  async getActiveBake(userId?: string): Promise<Bake | undefined> {
    if (userId) {
      const [activeBake] = await db
        .select()
        .from(bakes)
        .where(and(eq(bakes.userId, userId), eq(bakes.status, "active")));
      return activeBake;
    }
    // For backwards compatibility
    const [activeBake] = await db.select().from(bakes).where(eq(bakes.status, "active"));
    return activeBake;
  }

  async createBake(bake: InsertBake): Promise<Bake> {
    const [newBake] = await db.insert(bakes).values(bake).returning();
    return newBake;
  }

  async updateBake(id: string, bakeData: Partial<InsertBake>): Promise<Bake | undefined> {
    const [updatedBake] = await db
      .update(bakes)
      .set(bakeData)
      .where(eq(bakes.id, id))
      .returning();
    return updatedBake;
  }

  async deleteBake(id: string): Promise<boolean> {
    const result = await db.delete(bakes).where(eq(bakes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Timeline step operations
  async getTimelineSteps(bakeId: string): Promise<TimelineStep[]> {
    return await db
      .select()
      .from(timelineSteps)
      .where(eq(timelineSteps.bakeId, bakeId))
      .orderBy(timelineSteps.stepIndex);
  }

  async getTimelineStep(id: string): Promise<TimelineStep | undefined> {
    const [step] = await db.select().from(timelineSteps).where(eq(timelineSteps.id, id));
    return step;
  }

  async createTimelineStep(step: InsertTimelineStep): Promise<TimelineStep> {
    const [newStep] = await db.insert(timelineSteps).values(step).returning();
    return newStep;
  }

  async updateTimelineStep(id: string, stepData: Partial<InsertTimelineStep>): Promise<TimelineStep | undefined> {
    const [updatedStep] = await db
      .update(timelineSteps)
      .set(stepData)
      .where(eq(timelineSteps.id, id))
      .returning();
    return updatedStep;
  }

  async deleteTimelineStep(id: string): Promise<boolean> {
    const result = await db.delete(timelineSteps).where(eq(timelineSteps.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Bake note operations
  async getBakeNotes(bakeId: string): Promise<BakeNote[]> {
    return await db
      .select()
      .from(bakeNotes)
      .where(eq(bakeNotes.bakeId, bakeId))
      .orderBy(desc(bakeNotes.createdAt));
  }

  async getBakeNote(id: string): Promise<BakeNote | undefined> {
    const [note] = await db.select().from(bakeNotes).where(eq(bakeNotes.id, id));
    return note;
  }

  async createBakeNote(note: InsertBakeNote): Promise<BakeNote> {
    const [newNote] = await db.insert(bakeNotes).values(note).returning();
    return newNote;
  }

  async updateBakeNote(id: string, noteData: Partial<InsertBakeNote>): Promise<BakeNote | undefined> {
    const [updatedNote] = await db
      .update(bakeNotes)
      .set(noteData)
      .where(eq(bakeNotes.id, id))
      .returning();
    return updatedNote;
  }

  async deleteBakeNote(id: string): Promise<boolean> {
    const result = await db.delete(bakeNotes).where(eq(bakeNotes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Bake photo operations
  async getBakePhotos(bakeId: string): Promise<BakePhoto[]> {
    return await db
      .select()
      .from(bakePhotos)
      .where(eq(bakePhotos.bakeId, bakeId))
      .orderBy(desc(bakePhotos.createdAt));
  }

  async getBakePhoto(id: string): Promise<BakePhoto | undefined> {
    const [photo] = await db.select().from(bakePhotos).where(eq(bakePhotos.id, id));
    return photo;
  }

  async createBakePhoto(photo: InsertBakePhoto): Promise<BakePhoto> {
    const [newPhoto] = await db.insert(bakePhotos).values(photo).returning();
    return newPhoto;
  }

  async updateBakePhoto(id: string, photoData: Partial<InsertBakePhoto>): Promise<BakePhoto | undefined> {
    const [updatedPhoto] = await db
      .update(bakePhotos)
      .set(photoData)
      .where(eq(bakePhotos.id, id))
      .returning();
    return updatedPhoto;
  }

  async deleteBakePhoto(id: string): Promise<boolean> {
    const result = await db.delete(bakePhotos).where(eq(bakePhotos.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Tutorial operations
  async getTutorials(): Promise<Tutorial[]> {
    return await db.select().from(tutorials).orderBy(desc(tutorials.createdAt));
  }

  async getTutorial(id: string): Promise<Tutorial | undefined> {
    const [tutorial] = await db.select().from(tutorials).where(eq(tutorials.id, id));
    return tutorial;
  }

  async createTutorial(tutorial: InsertTutorial): Promise<Tutorial> {
    const [newTutorial] = await db.insert(tutorials).values(tutorial).returning();
    return newTutorial;
  }

  async updateTutorial(id: string, tutorialData: Partial<InsertTutorial>): Promise<Tutorial | undefined> {
    const [updatedTutorial] = await db
      .update(tutorials)
      .set(tutorialData)
      .where(eq(tutorials.id, id))
      .returning();
    return updatedTutorial;
  }

  async deleteTutorial(id: string): Promise<boolean> {
    const result = await db.delete(tutorials).where(eq(tutorials.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Sensor reading operations
  async getSensorReadings(): Promise<SensorReading[]> {
    return await db.select().from(sensorReadings).orderBy(desc(sensorReadings.timestamp));
  }

  async getLatestSensorReading(): Promise<SensorReading | undefined> {
    const [reading] = await db
      .select()
      .from(sensorReadings)
      .orderBy(desc(sensorReadings.timestamp))
      .limit(1);
    return reading;
  }

  async createSensorReading(reading: InsertSensorReading): Promise<SensorReading> {
    const [newReading] = await db.insert(sensorReadings).values(reading).returning();
    return newReading;
  }

  // Password reset token operations
  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db.insert(passwordResetTokens).values(tokenData).returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt)
      ));
    return resetToken;
  }

  async markPasswordResetTokenAsUsed(tokenId: string): Promise<boolean> {
    const [updatedToken] = await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenId))
      .returning();
    return !!updatedToken;
  }

  async cleanupExpiredPasswordResetTokens(): Promise<number> {
    const result = await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, new Date()));
    return result.rowCount || 0;
  }

  // Timeline plan operations
  async getTimelinePlans(userId?: string): Promise<TimelinePlan[]> {
    if (userId) {
      return await db.select().from(timelinePlans).where(eq(timelinePlans.userId, userId)).orderBy(desc(timelinePlans.createdAt));
    }
    // For backwards compatibility, return all plans if no userId provided
    return await db.select().from(timelinePlans).orderBy(desc(timelinePlans.createdAt));
  }

  async getTimelinePlan(id: string): Promise<TimelinePlan | undefined> {
    const [plan] = await db.select().from(timelinePlans).where(eq(timelinePlans.id, id));
    return plan;
  }

  async createTimelinePlan(planData: InsertTimelinePlan): Promise<TimelinePlan> {
    const [plan] = await db.insert(timelinePlans).values(planData).returning();
    return plan;
  }

  async updateTimelinePlan(id: string, planData: Partial<InsertTimelinePlan>): Promise<TimelinePlan | undefined> {
    const [updatedPlan] = await db
      .update(timelinePlans)
      .set({ ...planData, updatedAt: new Date() })
      .where(eq(timelinePlans.id, id))
      .returning();
    return updatedPlan;
  }

  async deleteTimelinePlan(id: string): Promise<boolean> {
    const result = await db.delete(timelinePlans).where(eq(timelinePlans.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();