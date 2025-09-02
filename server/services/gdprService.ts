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
  accountAuditLog,
  dataDeletionRequests,
  passwordResetTokens,
  type User,
  type InsertAccountAuditLog,
  type InsertDataDeletionRequest,
  type DataDeletionRequest
} from "../../shared/schema";
import { eq, and, sql, or } from "drizzle-orm";
import { Request } from "express";

export interface DataExportOptions {
  format: 'json' | 'csv' | 'zip';
  includeAnalytics: boolean;
  includeSensors: boolean;
  includePhotos: boolean;
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

export interface UserExportData {
  exportMetadata: {
    exportDate: string;
    userId: string;
    userEmail: string;
    format: string;
    gdprCompliant: boolean;
    dataControllerInfo: {
      name: string;
      contact: string;
      address: string;
    };
  };
  personalData: {
    profile: {
      id: string;
      username: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    };
    subscription: {
      subscriptionStatus: string;
      entitlements: any;
      createdAt: Date | null;
      updatedAt: Date | null;
    } | null;
  };
  bakingData: {
    recipes: any[];
    bakes: any[];
    timelinePlans: any[];
    starterLogs: any[];
    bakeNotes: any[];
    bakePhotos: any[];
  };
  technicalData?: {
    analyticsEvents: any[];
    sensorReadings: any[];
  };
  legalData: {
    consentRecords: any[];
    legalBasis: string;
    dataRetentionPolicy: string;
    rightsInformation: {
      rightToAccess: string;
      rightToRectification: string;
      rightToErasure: string;
      rightToPortability: string;
      rightToObject: string;
    };
  };
  statistics: {
    totalRecipes: number;
    totalBakes: number;
    totalNotes: number;
    totalPhotos: number;
    accountAge: string;
  };
  auditTrail: any[];
}

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

export interface ComplianceReport {
  userId: string;
  userEmail: string;
  dataCategories: {
    category: string;
    recordCount: number;
    lastUpdated: Date;
    retentionPeriod: string;
  }[];
  legalBasis: string;
  retentionJustification: string;
  processingActivities: string[];
}

export class GDPRService {
  /**
   * Log an audit event for compliance tracking
   */
  static async logAuditEvent(
    userId: string,
    userEmail: string,
    action: string,
    category: string,
    details: any,
    req?: Request,
    success = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      const auditData: InsertAccountAuditLog = {
        userId,
        userEmail,
        action,
        actionCategory: category,
        details,
        ipAddress: req?.ip || null,
        userAgent: req?.get('User-Agent') || null,
        success,
        errorMessage,
        performedBy: 'user',
        retentionDate: this.calculateAuditRetentionDate(),
      };

      await db.insert(accountAuditLog).values(auditData);
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Calculate retention date for audit records (7 years for GDPR compliance)
   */
  private static calculateAuditRetentionDate(): Date {
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 7);
    return retentionDate;
  }

  /**
   * Export all user data in compliance with GDPR Article 20 (Right to Data Portability)
   */
  static async exportUserData(userId: string, options: DataExportOptions = {
    format: 'json',
    includeAnalytics: true,
    includeSensors: true,
    includePhotos: true
  }): Promise<UserExportData> {
    try {
      console.log(`📄 Starting GDPR data export for user: ${userId}`);
      
      // Get user information
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Gather all user data
      const userRecipes = await storage.getRecipes(userId);
      const userBakes = await storage.getBakes(userId);
      const userTimelinePlans = await storage.getTimelinePlans(userId);
      const userStarterLogs = await storage.getStarterLogs(userId);

      // Get user entitlements
      const [userEntitlement] = await db.select()
        .from(userEntitlements)
        .where(eq(userEntitlements.userId, userId));

      // Get bake-related data
      const bakeIds = userBakes.map(bake => bake.id);
      let allNotes: any[] = [];
      let allPhotos: any[] = [];
      let allTimelineSteps: any[] = [];

      for (const bakeId of bakeIds) {
        const notes = await storage.getBakeNotes(bakeId);
        const photos = options.includePhotos ? await storage.getBakePhotos(bakeId) : [];
        const steps = await storage.getTimelineSteps(bakeId);
        
        allNotes.push(...notes);
        allPhotos.push(...photos);
        allTimelineSteps.push(...steps);
      }

      // Conditionally include analytics and sensor data
      let userAnalytics: any[] = [];
      let userSensors: any[] = [];

      if (options.includeAnalytics) {
        userAnalytics = await db.select()
          .from(analyticsEvents)
          .where(eq(analyticsEvents.userId, userId));
      }

      if (options.includeSensors) {
        userSensors = await storage.getSensorReadings(userId);
      }

      // Get audit trail for this user
      const auditTrail = await db.select()
        .from(accountAuditLog)
        .where(eq(accountAuditLog.userId, userId));

      const exportData = {
        exportMetadata: {
          exportDate: new Date().toISOString(),
          userId,
          userEmail: user.email,
          format: options.format,
          gdprCompliant: true,
          dataControllerInfo: {
            name: "CrumbCoach",
            contact: process.env.DATA_PROTECTION_EMAIL || "privacy@crumbcoach.com",
            address: "Data Protection Team, CrumbCoach"
          }
        },
        personalData: {
          profile: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          },
          subscription: userEntitlement ? {
            subscriptionStatus: userEntitlement.subscriptionStatus,
            entitlements: userEntitlement.entitlements,
            createdAt: userEntitlement.createdAt,
            updatedAt: userEntitlement.updatedAt
          } : null
        },
        bakingData: {
          recipes: userRecipes,
          bakes: userBakes,
          timelinePlans: userTimelinePlans,
          starterLogs: userStarterLogs,
          bakeNotes: allNotes,
          bakePhotos: allPhotos
        },
        activityData: {
          bakeNotes: allNotes,
          bakePhotos: allPhotos.map(photo => ({
            ...photo,
            // Include metadata but not actual file content for privacy
            note: "Photo files must be requested separately for download"
          })),
          timelineSteps: allTimelineSteps,
          sensorReadings: userSensors,
          analytics: userAnalytics
        },
        complianceData: {
          auditTrail: auditTrail.map(log => ({
            action: log.action,
            timestamp: log.timestamp,
            ipAddress: log.ipAddress ? "***.***.***." + log.ipAddress.split('.').pop() : null, // Partially masked
            success: log.success
          })),
          legalBasis: "Consent (GDPR Article 6.1.a) and Legitimate Interest (GDPR Article 6.1.f)",
          dataRetentionPolicy: "Personal data is retained for 7 years after account closure",
          rightsInformation: {
            rightToAccess: "You have the right to access your personal data",
            rightToRectification: "You have the right to correct inaccurate data",
            rightToErasure: "You have the right to request deletion of your data",
            rightToPortability: "You have the right to receive your data in a portable format",
            rightToObject: "You have the right to object to processing of your data"
          }
        },
        statistics: {
          totalRecipes: userRecipes.length,
          totalBakes: userBakes.length,
          totalNotes: allNotes.length,
          totalPhotos: allPhotos.length,
          accountAge: user.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) + ' days' : 'Unknown'
        },
        legalData: {
          consentRecords: [],
          legalBasis: "Consent (GDPR Article 6.1.a) and Legitimate Interest (GDPR Article 6.1.f)",
          dataRetentionPolicy: "Personal data is retained for 7 years after account closure",
          rightsInformation: {
            rightToAccess: "You have the right to access your personal data",
            rightToRectification: "You have the right to correct inaccurate data",
            rightToErasure: "You have the right to request deletion of your data",
            rightToPortability: "You have the right to receive your data in a portable format",
            rightToObject: "You have the right to object to processing of your data"
          }
        },
        auditTrail
      };

      // Log the export
      await this.logAuditEvent(
        userId,
        user.email,
        'data_export_requested',
        'compliance',
        { format: options.format, includeAnalytics: options.includeAnalytics }
      );

      console.log(`✅ GDPR data export completed for user: ${userId}`);
      return exportData;
    } catch (error) {
      console.error('GDPR data export failed:', error);
      throw error;
    }
  }

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
    await this.logAuditEvent(
      userId,
      user.email,
      'data_deletion_requested',
      'compliance',
      { requestType, requestId: request.id },
      req
    );

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
    await this.logAuditEvent(
      request.userId,
      request.userEmail,
      'data_deletion_confirmed',
      'compliance',
      { requestId: request.id, requestType: request.requestType },
      req
    );

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
      await this.logAuditEvent(
        request.userId,
        request.userEmail,
        'data_deletion_completed',
        'compliance',
        {
          requestId: request.id,
          requestType: request.requestType,
          recordsDeleted: deletionSummary.totalRecordsDeleted,
          processingTimeMs: processingTime
        },
        req
      );

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

      await this.logAuditEvent(
        request.userId,
        request.userEmail,
        'data_deletion_failed',
        'compliance',
        {
          requestId: request.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        req,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  }

  /**
   * Perform complete data deletion
   */
  private static async performFullDeletion(userId: string): Promise<DeletionSummary> {
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

    // Get counts before deletion for summary
    const [userCount] = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.id, userId));
    const [recipeCount] = await db.select({ count: sql`count(*)` }).from(recipes).where(eq(recipes.userId, userId));
    const [bakeCount] = await db.select({ count: sql`count(*)` }).from(bakes).where(eq(bakes.userId, userId));

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
  private static async performAnonymization(userId: string): Promise<DeletionSummary> {
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
  private static async getDataSummary(userId: string): Promise<DataSummary> {
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
   * Generate compliance report for a user
   */
  static async generateComplianceReport(userId: string): Promise<ComplianceReport> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const dataSummary = await this.getDataSummary(userId);

    return {
      userId,
      userEmail: user.email,
      dataCategories: [
        {
          category: 'Profile Information',
          recordCount: 1,
          lastUpdated: user.updatedAt || user.createdAt || new Date(),
          retentionPeriod: '7 years after account closure'
        },
        {
          category: 'Baking Data',
          recordCount: dataSummary.recipes + dataSummary.bakes,
          lastUpdated: new Date(), // Would need to calculate actual last update
          retentionPeriod: '7 years after account closure'
        },
        {
          category: 'Analytics Data',
          recordCount: dataSummary.analytics,
          lastUpdated: new Date(),
          retentionPeriod: '2 years from collection'
        }
      ],
      legalBasis: 'Consent (GDPR Article 6.1.a) and Legitimate Interest (GDPR Article 6.1.f)',
      retentionJustification: 'Data retained for service provision and legal compliance',
      processingActivities: [
        'User account management',
        'Baking recipe and log management',
        'Service analytics and improvement',
        'Customer support'
      ]
    };
  }

  /**
   * Clean up expired audit logs and deletion requests
   */
  static async cleanupExpiredData(): Promise<number> {
    const now = new Date();
    let totalCleaned = 0;

    try {
      // Clean up expired audit logs
      const auditResult = await db.delete(accountAuditLog)
        .where(and(
          sql`${accountAuditLog.retentionDate} IS NOT NULL`,
          sql`${accountAuditLog.retentionDate} < ${now}`
        ));
      totalCleaned += auditResult.rowCount || 0;

      // Clean up old deletion requests (keep for 1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const deletionResult = await db.delete(dataDeletionRequests)
        .where(sql`${dataDeletionRequests.createdAt} < ${oneYearAgo}`);
      totalCleaned += deletionResult.rowCount || 0;

      console.log(`🧹 Cleaned up ${totalCleaned} expired compliance records`);
    } catch (error) {
      console.error('Failed to clean up expired data:', error);
    }

    return totalCleaned;
  }
}

export default GDPRService;