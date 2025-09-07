import { db } from "../db";
import { storage } from "../storage";
import { emailService } from "./email";
import { randomUUID } from "crypto";
import {
  users,
  recipes,
  bakes,
  bakeNotes,
  bakePhotos,
  timelineSteps,
  starterLogs,
  timelinePlans,
  userEntitlements,
  analyticsEvents,
  userSessions,
  sensorReadings,
  dataDeletionRequests,
  passwordResetTokens,
  type InsertDataDeletionRequest,
  type DataDeletionRequest
} from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import { Request } from "express";
import { AuditService } from "./auditService";

export interface DeletionSummary {
  recordsDeleted: {
    users: number;
    recipes: number;
    bakes: number;
    notes: number;
    photos: number;
    analytics: number;
    [key: string]: number;
  };
  totalRecordsDeleted: number;
  dataSize: string;
  deletionTime: number;
  userId?: string;
}

export interface DataSummary {
  users: number;
  recipes: number;
  bakes: number;
  notes: number;
  photos: number;
  analytics: number;
  sensors: number;
  sessions: number;
  totalRecords: number;
  estimatedSize: string;
}

export class DataDeletionService {
  /**
   * Create a data deletion request with confirmation token
   */
  static async requestDataDeletion(
    userId: string,
    requestType: 'full_deletion' | 'anonymization' = 'full_deletion',
    req?: Request
  ): Promise<{ requestId: string; confirmationToken: string; expiresAt: Date }> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate secure confirmation token
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
    
    // Get data summary
    const dataSummary = await this.getDataSummary(userId);

    const deletionRequest: InsertDataDeletionRequest = {
      userId,
      userEmail: user.email,
      requestToken: token,
      requestType,
      confirmationExpiresAt: expiresAt,
      dataSummary,
      auditTrail: {
        requestInitiated: new Date(),
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent')
      }
    };

    const [request] = await db.insert(dataDeletionRequests)
      .values(deletionRequest)
      .returning();

    // Log the request
    await AuditService.logEvent({
      userId,
      userEmail: user.email,
      action: 'data_deletion_requested',
      category: 'compliance',
      details: { requestType, requestId: request.id },
      req
    });

    // Send confirmation email
    await emailService.sendNotificationEmail(
      user.email,
      'Confirm Account Deletion Request',
      `Hello ${user.firstName || user.username},

You have requested ${requestType === 'full_deletion' ? 'complete deletion' : 'anonymization'} of your CrumbCoach account.

To confirm this request, use this confirmation token: ${token}

This token will expire on ${expiresAt.toLocaleString()}.

If you did not make this request, please ignore this email.

Note: This action cannot be undone. All your baking data, recipes, and account information will be permanently removed.`
    );

    return {
      requestId: request.id,
      confirmationToken: token,
      expiresAt: expiresAt
    };
  }

  /**
   * Confirm and process data deletion request
   */
  static async confirmDataDeletion(
    confirmationToken: string,
    req?: Request
  ): Promise<DeletionSummary> {
    // Find the deletion request by token
    const [request] = await db.select()
      .from(dataDeletionRequests)
      .where(eq(dataDeletionRequests.requestToken, confirmationToken));

    if (!request) {
      throw new Error('Deletion request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Request already ${request.status}`);
    }

    // Validate token
    if (request.requestToken !== confirmationToken) {
      throw new Error('Invalid confirmation token');
    }

    if (request.confirmationExpiresAt && request.confirmationExpiresAt < new Date()) {
      throw new Error('Confirmation token has expired');
    }

    // Mark as confirmed and start processing
    await db.update(dataDeletionRequests)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(dataDeletionRequests.id, request.id));

    const user = await storage.getUser(request.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Log confirmation
    await AuditService.logEvent({
      userId: request.userId,
      userEmail: request.userEmail,
      action: 'data_deletion_confirmed',
      category: 'compliance',
      details: { requestId: request.id, requestType: request.requestType },
      req
    });

    // Process the deletion
    const startTime = Date.now();
    let deletionSummary: DeletionSummary;

    try {
      // Mark as processing
      await db.update(dataDeletionRequests)
        .set({
          status: 'processing',
          processedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(dataDeletionRequests.id, request.id));

      if (request.requestType === 'full_deletion') {
        deletionSummary = await this.performFullDeletion(request.userId);
      } else {
        deletionSummary = await this.performAnonymization(request.userId);
      }

      const processingTime = Date.now() - startTime;

      // Mark as completed
      await db.update(dataDeletionRequests)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
          auditTrail: {
            ...(typeof request.auditTrail === 'object' && request.auditTrail !== null ? request.auditTrail as Record<string, any> : {}),
            processingStarted: new Date(startTime),
            processingCompleted: new Date(),
            processingTimeMs: processingTime,
            deletionSummary
          }
        })
        .where(eq(dataDeletionRequests.id, request.id));

      // Send confirmation email
      await emailService.sendAccountDeletionEmail({
        userEmail: request.userEmail,
        userName: user.firstName || user.username || 'User',
        deletionDate: new Date()
      });

      // Final audit log
      await AuditService.logEvent({
        userId: request.userId,
        userEmail: request.userEmail,
        action: 'data_deletion_completed',
        category: 'compliance',
        details: {
          requestId: request.id,
          requestType: request.requestType,
          recordsDeleted: deletionSummary.totalRecordsDeleted,
          processingTimeMs: processingTime
        },
        req
      });

      deletionSummary.deletionTime = processingTime;
      deletionSummary.userId = request.userId;
      return deletionSummary;

    } catch (error) {
      // Mark as failed
      await db.update(dataDeletionRequests)
        .set({
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        })
        .where(eq(dataDeletionRequests.id, request.id));

      await AuditService.logEvent({
        userId: request.userId,
        userEmail: request.userEmail,
        action: 'data_deletion_failed',
        category: 'compliance',
        details: {
          requestId: request.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        req,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Perform complete data deletion
   */
  static async performFullDeletion(userId: string): Promise<DeletionSummary> {
    console.log(`🗑️ Starting full deletion for user: ${userId}`);
    
    const recordsDeleted: {
      users: number;
      recipes: number;
      bakes: number;
      notes: number;
      photos: number;
      analytics: number;
      [key: string]: number;
    } = {
      users: 0,
      recipes: 0,
      bakes: 0,
      notes: 0,
      photos: 0,
      analytics: 0
    };
    let totalDeleted = 0;

    // Delete in dependency order
    const deletionOperations = [
      { table: sensorReadings, condition: sql`${sensorReadings.bakeId} IN (SELECT id FROM bakes WHERE user_id = ${userId})`, name: 'sensorReadings' },
      { table: bakePhotos, condition: sql`${bakePhotos.bakeId} IN (SELECT id FROM bakes WHERE user_id = ${userId})`, name: 'bakePhotos' },
      { table: bakeNotes, condition: sql`${bakeNotes.bakeId} IN (SELECT id FROM bakes WHERE user_id = ${userId})`, name: 'bakeNotes' },
      { table: timelineSteps, condition: sql`${timelineSteps.bakeId} IN (SELECT id FROM bakes WHERE user_id = ${userId})`, name: 'timelineSteps' },
      { table: timelinePlans, condition: eq(timelinePlans.userId, userId), name: 'timelinePlans' },
      { table: bakes, condition: eq(bakes.userId, userId), name: 'bakes' },
      { table: recipes, condition: eq(recipes.userId, userId), name: 'recipes' },
      { table: starterLogs, condition: eq(starterLogs.userId, userId), name: 'starterLogs' },
      { table: userEntitlements, condition: eq(userEntitlements.userId, userId), name: 'userEntitlements' },
      { table: analyticsEvents, condition: eq(analyticsEvents.userId, userId), name: 'analyticsEvents' },
      { table: userSessions, condition: eq(userSessions.userId, userId), name: 'userSessions' },
      { table: passwordResetTokens, condition: eq(passwordResetTokens.userId, userId), name: 'passwordResetTokens' },
    ];

    for (const op of deletionOperations) {
      try {
        const result = await db.delete(op.table).where(op.condition);
        const deleted = result.rowCount || 0;
        
        // Map operation names to interface keys
        switch (op.name) {
          case 'bakeNotes':
            recordsDeleted.notes += deleted;
            break;
          case 'bakePhotos':
            recordsDeleted.photos += deleted;
            break;
          case 'analyticsEvents':
            recordsDeleted.analytics += deleted;
            break;
          case 'recipes':
            recordsDeleted.recipes = deleted;
            break;
          case 'bakes':
            recordsDeleted.bakes = deleted;
            break;
          default:
            recordsDeleted[op.name] = deleted;
            break;
        }
        
        totalDeleted += deleted;
      } catch (error) {
        console.error(`Failed to delete ${op.name}:`, error);
      }
    }

    // Finally delete the user
    const userResult = await db.delete(users).where(eq(users.id, userId));
    recordsDeleted.users = userResult.rowCount || 0;
    totalDeleted += recordsDeleted.users;

    console.log(`✅ Full deletion completed. Total records deleted: ${totalDeleted}`);

    return {
      recordsDeleted,
      totalRecordsDeleted: totalDeleted,
      dataSize: 'Unknown', // Could be calculated if needed
      deletionTime: 0 // Will be set by caller
    };
  }

  /**
   * Perform data anonymization (keeps data but removes personal identifiers)
   */
  static async performAnonymization(userId: string): Promise<DeletionSummary> {
    console.log(`🎭 Starting anonymization for user: ${userId}`);
    
    const anonymizedData = {
      username: `anonymous_${Date.now()}`,
      email: `deleted_${Date.now()}@example.com`,
      password: 'ACCOUNT_ANONYMIZED',
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      updatedAt: new Date()
    };

    const result = await db.update(users)
      .set(anonymizedData)
      .where(eq(users.id, userId));

    console.log('✅ Anonymization completed');

    return {
      recordsDeleted: {
        users: 0, // Not deleted, just anonymized
        recipes: 0,
        bakes: 0,
        notes: 0,
        photos: 0,
        analytics: 0
      },
      totalRecordsDeleted: 1,
      dataSize: 'Personal identifiers only',
      deletionTime: 0
    };
  }

  /**
   * Get summary of user data for deletion planning
   */
  static async getDataSummary(userId: string): Promise<DataSummary> {
    const [userCountResult] = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.id, userId));
    const [recipeCountResult] = await db.select({ count: sql`count(*)` }).from(recipes).where(eq(recipes.userId, userId));
    const [bakeCountResult] = await db.select({ count: sql`count(*)` }).from(bakes).where(eq(bakes.userId, userId));
    
    // Get bake-related data counts using subqueries
    const [notesCountResult] = await db.select({ count: sql`count(*)` }).from(bakeNotes)
      .where(sql`${bakeNotes.bakeId} IN (SELECT id FROM ${bakes} WHERE user_id = ${userId})`);
    const [photosCountResult] = await db.select({ count: sql`count(*)` }).from(bakePhotos)
      .where(sql`${bakePhotos.bakeId} IN (SELECT id FROM ${bakes} WHERE user_id = ${userId})`);
    
    const [analyticsCountResult] = await db.select({ count: sql`count(*)` }).from(analyticsEvents).where(eq(analyticsEvents.userId, userId));
    
    // Sensor readings don't have userId, they're linked through bakes
    const [sensorsCountResult] = await db.select({ count: sql`count(*)` }).from(sensorReadings)
      .where(sql`${sensorReadings.bakeId} IN (SELECT id FROM ${bakes} WHERE user_id = ${userId})`);
    const [sessionsCountResult] = await db.select({ count: sql`count(*)` }).from(userSessions).where(eq(userSessions.userId, userId));

    const userCount = Number(userCountResult.count) || 0;
    const recipeCount = Number(recipeCountResult.count) || 0;
    const bakeCount = Number(bakeCountResult.count) || 0;
    const notesCount = Number(notesCountResult.count) || 0;
    const photosCount = Number(photosCountResult.count) || 0;
    const analyticsCount = Number(analyticsCountResult.count) || 0;
    const sensorsCount = Number(sensorsCountResult.count) || 0;
    const sessionsCount = Number(sessionsCountResult.count) || 0;
    const totalRecords = userCount + recipeCount + bakeCount + notesCount + photosCount + analyticsCount + sensorsCount + sessionsCount;

    return {
      users: userCount,
      recipes: recipeCount,
      bakes: bakeCount,
      notes: notesCount,
      photos: photosCount,
      analytics: analyticsCount,
      sensors: sensorsCount,
      sessions: sessionsCount,
      totalRecords,
      estimatedSize: totalRecords < 100 ? 'Small' : totalRecords < 1000 ? 'Medium' : 'Large'
    };
  }

  /**
   * Clean up old deletion requests (keep for 1 year)
   */
  static async cleanupExpiredRequests(): Promise<number> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    try {
      const result = await db.delete(dataDeletionRequests)
        .where(sql`${dataDeletionRequests.createdAt} < ${oneYearAgo}`);
      
      const cleaned = result.rowCount || 0;
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} old deletion requests`);
      }
      return cleaned;
    } catch (error) {
      console.error('Failed to clean up expired deletion requests:', error);
      return 0;
    }
  }
}

export default DataDeletionService;