import {
  users,
  recipes,
  bakes,
  timelineSteps,
  bakeNotes,
  bakePhotos,
  tutorials,
  sensorReadings,
  analyticsEvents,
  userSessions,
  starterLogs,
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
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  type UserSession,
  type InsertUserSession,
  type StarterLog,
  type InsertStarterLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, lt, gte, count, sql, or } from "drizzle-orm";
import { randomUUID } from "crypto";

// Interface for storage operations
export interface IStorage {
  // User operations - traditional authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: InsertUser): Promise<User>;
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
  getBakePhoto(id: string): Promise<BakePhoto | undefined>;
  getBakePhotos(bakeId: string): Promise<BakePhoto[]>;
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
  getSensorReadings(userId?: string): Promise<SensorReading[]>;
  getLatestSensorReading(userId?: string): Promise<SensorReading | undefined>;
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

  // Starter log operations
  getStarterLogs(userId?: string): Promise<StarterLog[]>;
  getStarterLog(id: string): Promise<StarterLog | undefined>;
  createStarterLog(log: InsertStarterLog): Promise<StarterLog>;
  updateStarterLog(id: string, logData: Partial<InsertStarterLog>): Promise<StarterLog | undefined>;
  deleteStarterLog(id: string): Promise<boolean>;
  
  // GDPR/CCPA Compliance operations
  deleteAllUserData(userId: string): Promise<boolean>;
  exportUserData(userId: string): Promise<any>;
  anonymizeUserData(userId: string): Promise<boolean>;
  cleanupExpiredData(): Promise<number>;
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

  async upsertUser(userData: InsertUser): Promise<User> {
    const existingUser = await this.getUser(userData.id);
    if (existingUser) {
      const updated = await this.updateUser(userData.id, userData);
      return updated || existingUser;
    } else {
      return await this.createUser(userData);
    }
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
  async getBakePhoto(id: string): Promise<BakePhoto | undefined> {
    const [photo] = await db.select().from(bakePhotos).where(eq(bakePhotos.id, id));
    return photo || undefined;
  }

  async getBakePhotos(bakeId: string): Promise<BakePhoto[]> {
    return await db
      .select()
      .from(bakePhotos)
      .where(eq(bakePhotos.bakeId, bakeId))
      .orderBy(desc(bakePhotos.createdAt));
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
  async getSensorReadings(userId?: string): Promise<SensorReading[]> {
    if (userId) {
      // Get readings that are either global (no bakeId) or belong to user's bakes
      return await db.select({
        id: sensorReadings.id,
        bakeId: sensorReadings.bakeId,
        temperature: sensorReadings.temperature,
        humidity: sensorReadings.humidity,
        timestamp: sensorReadings.timestamp,
      })
      .from(sensorReadings)
      .leftJoin(bakes, eq(sensorReadings.bakeId, bakes.id))
      .where(or(
        isNull(sensorReadings.bakeId), // Global readings
        eq(bakes.userId, userId)        // User's bake-specific readings
      ))
      .orderBy(desc(sensorReadings.timestamp));
    }
    return await db.select().from(sensorReadings).orderBy(desc(sensorReadings.timestamp));
  }

  async getLatestSensorReading(userId?: string): Promise<SensorReading | undefined> {
    if (userId) {
      // Get latest reading that is either global (no bakeId) or belongs to user's bakes
      const [reading] = await db.select({
        id: sensorReadings.id,
        bakeId: sensorReadings.bakeId,
        temperature: sensorReadings.temperature,
        humidity: sensorReadings.humidity,
        timestamp: sensorReadings.timestamp,
      })
      .from(sensorReadings)
      .leftJoin(bakes, eq(sensorReadings.bakeId, bakes.id))
      .where(or(
        isNull(sensorReadings.bakeId), // Global readings
        eq(bakes.userId, userId)        // User's bake-specific readings
      ))
      .orderBy(desc(sensorReadings.timestamp))
      .limit(1);
      return reading;
    }
    
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

  // Starter log operations
  async getStarterLogs(userId?: string): Promise<StarterLog[]> {
    if (userId) {
      return await db.select().from(starterLogs).where(eq(starterLogs.userId, userId)).orderBy(desc(starterLogs.logDate));
    }
    // For backwards compatibility, return all logs if no userId provided
    return await db.select().from(starterLogs).orderBy(desc(starterLogs.logDate));
  }

  async getStarterLog(id: string): Promise<StarterLog | undefined> {
    const [log] = await db.select().from(starterLogs).where(eq(starterLogs.id, id));
    return log;
  }

  async createStarterLog(logData: InsertStarterLog): Promise<StarterLog> {
    const [log] = await db.insert(starterLogs).values(logData).returning();
    return log;
  }

  async updateStarterLog(id: string, logData: Partial<InsertStarterLog>): Promise<StarterLog | undefined> {
    const [updatedLog] = await db
      .update(starterLogs)
      .set({ ...logData, updatedAt: new Date() })
      .where(eq(starterLogs.id, id))
      .returning();
    return updatedLog;
  }

  async deleteStarterLog(id: string): Promise<boolean> {
    const result = await db.delete(starterLogs).where(eq(starterLogs.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // GDPR/CCPA Compliance operations
  async deleteAllUserData(userId: string): Promise<boolean> {
    try {
      console.log('GDPR: Starting complete data deletion for user:', userId);
      
      // Delete user data in order of dependencies (child records first)
      await db.delete(sensorReadings).where(eq(sensorReadings.userId, userId));
      await db.delete(bakePhotos).where(eq(bakePhotos.userId, userId));
      await db.delete(bakeNotes).where(eq(bakeNotes.userId, userId));
      await db.delete(timelineSteps).where(sql`${timelineSteps.bakeId} IN (SELECT id FROM bakes WHERE userId = ${userId})`);
      await db.delete(timelinePlans).where(eq(timelinePlans.userId, userId));
      await db.delete(bakes).where(eq(bakes.userId, userId));
      await db.delete(recipes).where(eq(recipes.userId, userId));
      await db.delete(starterLogs).where(eq(starterLogs.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
      
      console.log('GDPR: Complete data deletion successful');
      return true;
    } catch (error) {
      console.error('GDPR: Data deletion failed:', error);
      return false;
    }
  }

  async exportUserData(userId: string): Promise<any> {
    try {
      console.log('GDPR: Starting data export for user:', userId);
      
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const userRecipes = await db.select().from(recipes).where(eq(recipes.userId, userId));
      const userBakes = await db.select().from(bakes).where(eq(bakes.userId, userId));
      const userNotes = await db.select().from(bakeNotes).where(eq(bakeNotes.userId, userId));
      const userPhotos = await db.select().from(bakePhotos).where(eq(bakePhotos.userId, userId));
      const userSensors = await db.select().from(sensorReadings).where(eq(sensorReadings.userId, userId));
      const userLogs = await db.select().from(starterLogs).where(eq(starterLogs.userId, userId));
      const userPlans = await db.select().from(timelinePlans).where(eq(timelinePlans.userId, userId));
      
      // Get timeline steps for user's bakes
      const bakeIds = userBakes.map(bake => bake.id);
      let userTimeline = [];
      if (bakeIds.length > 0) {
        userTimeline = await db.select().from(timelineSteps)
          .where(sql`${timelineSteps.bakeId} IN (${sql.join(bakeIds.map(id => sql`${id}`), sql`, `)})`);
      }
      
      return {
        profile: {
          id: user?.id,
          username: user?.username,
          email: user?.email,
          createdAt: user?.createdAt,
          updatedAt: user?.updatedAt
        },
        recipes: userRecipes,
        bakes: userBakes,
        notes: userNotes,
        photos: userPhotos,
        sensorReadings: userSensors,
        starterLogs: userLogs,
        timelinePlans: userPlans,
        timelineSteps: userTimeline
      };
    } catch (error) {
      console.error('GDPR: Data export failed:', error);
      throw error;
    }
  }

  async anonymizeUserData(userId: string): Promise<boolean> {
    try {
      console.log('GDPR: Starting data anonymization for user:', userId);
      
      // Anonymize personal data while keeping recipe/baking data
      const anonymizedData = {
        username: `anonymous_${Date.now()}`,
        email: `deleted_${Date.now()}@example.com`,
        password: 'ACCOUNT_DELETED',
        updatedAt: new Date()
      };
      
      await db.update(users)
        .set(anonymizedData)
        .where(eq(users.id, userId));
      
      console.log('GDPR: Data anonymization successful');
      return true;
    } catch (error) {
      console.error('GDPR: Data anonymization failed:', error);
      return false;
    }
  }

  async cleanupExpiredData(): Promise<number> {
    try {
      // Delete data older than 7 years (GDPR retention limit)
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 7);
      
      let totalDeleted = 0;
      
      // Clean up old sensor readings (keep only last 2 years)
      const sensorCutoff = new Date();
      sensorCutoff.setFullYear(sensorCutoff.getFullYear() - 2);
      const sensorResult = await db.delete(sensorReadings)
        .where(sql`${sensorReadings.timestamp} < ${sensorCutoff}`);
      totalDeleted += sensorResult.rowCount || 0;
      
      // Clean up old bakes and associated data
      const bakeResult = await db.delete(bakes)
        .where(sql`${bakes.createdAt} < ${cutoffDate}`);
      totalDeleted += bakeResult.rowCount || 0;
      
      console.log(`Data retention: Cleaned up ${totalDeleted} expired records`);
      return totalDeleted;
    } catch (error) {
      console.error('Data retention cleanup failed:', error);
      return 0;
    }
  }
}

export const storage = new DatabaseStorage();