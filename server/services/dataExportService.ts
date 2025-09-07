import { db } from "../db";
import { storage } from "../storage";
import {
  userEntitlements,
  analyticsEvents,
  accountAuditLog
} from "../../shared/schema";
import { eq } from "drizzle-orm";
import { AuditService } from "./auditService";

export interface DataExportOptions {
  format: 'json' | 'csv' | 'zip';
  includeAnalytics: boolean;
  includeSensors: boolean;
  includePhotos: boolean;
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
  activityData: {
    bakeNotes: any[];
    bakePhotos: any[];
    timelineSteps: any[];
    sensorReadings: any[];
    analytics: any[];
  };
  complianceData: {
    auditTrail: any[];
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
  auditTrail: any[];
}

export class DataExportService {
  /**
   * Export all user data in compliance with GDPR Article 20 (Right to Data Portability)
   */
  static async exportUserData(
    userId: string, 
    options: DataExportOptions = {
      format: 'json',
      includeAnalytics: true,
      includeSensors: true,
      includePhotos: true
    }
  ): Promise<UserExportData> {
    try {
      console.log(`📄 Starting GDPR data export for user: ${userId}`);
      
      // Get user information
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Gather personal data
      const personalData = await this.gatherPersonalData(userId);
      
      // Gather baking data
      const bakingData = await this.gatherBakingData(userId, options);
      
      // Gather activity data
      const activityData = await this.gatherActivityData(userId, options);
      
      // Gather compliance data
      const complianceData = await this.gatherComplianceData(userId);
      
      // Calculate statistics
      const statistics = this.calculateStatistics(user, bakingData);

      const exportData: UserExportData = {
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
        personalData,
        bakingData,
        activityData,
        complianceData,
        statistics,
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
        auditTrail: complianceData.auditTrail
      };

      // Log the export
      await AuditService.logEvent({
        userId,
        userEmail: user.email,
        action: 'data_export_requested',
        category: 'compliance',
        details: { format: options.format, includeAnalytics: options.includeAnalytics }
      });

      console.log(`✅ GDPR data export completed for user: ${userId}`);
      return exportData;
    } catch (error) {
      console.error('GDPR data export failed:', error);
      throw error;
    }
  }

  private static async gatherPersonalData(userId: string) {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    // Get user entitlements
    const [userEntitlement] = await db.select()
      .from(userEntitlements)
      .where(eq(userEntitlements.userId, userId));

    return {
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
    };
  }

  private static async gatherBakingData(userId: string, options: DataExportOptions) {
    const userRecipes = await storage.getRecipes(userId);
    const userBakes = await storage.getBakes(userId);
    const userTimelinePlans = await storage.getTimelinePlans(userId);
    const userStarterLogs = await storage.getStarterLogs(userId);

    // Get bake-related data
    const bakeIds = userBakes.map(bake => bake.id);
    let allNotes: any[] = [];
    let allPhotos: any[] = [];

    for (const bakeId of bakeIds) {
      const notes = await storage.getBakeNotes(bakeId);
      const photos = options.includePhotos ? await storage.getBakePhotos(bakeId) : [];
      
      allNotes.push(...notes);
      allPhotos.push(...photos);
    }

    return {
      recipes: userRecipes,
      bakes: userBakes,
      timelinePlans: userTimelinePlans,
      starterLogs: userStarterLogs,
      bakeNotes: allNotes,
      bakePhotos: allPhotos
    };
  }

  private static async gatherActivityData(userId: string, options: DataExportOptions) {
    const userBakes = await storage.getBakes(userId);
    const bakeIds = userBakes.map(bake => bake.id);
    
    let allNotes: any[] = [];
    let allPhotos: any[] = [];
    let allTimelineSteps: any[] = [];
    let userAnalytics: any[] = [];
    let userSensors: any[] = [];

    // Bake-related activity data
    for (const bakeId of bakeIds) {
      const notes = await storage.getBakeNotes(bakeId);
      const photos = options.includePhotos ? await storage.getBakePhotos(bakeId) : [];
      const steps = await storage.getTimelineSteps(bakeId);
      
      allNotes.push(...notes);
      allPhotos.push(...photos);
      allTimelineSteps.push(...steps);
    }

    // Analytics and sensor data
    if (options.includeAnalytics) {
      userAnalytics = await db.select()
        .from(analyticsEvents)
        .where(eq(analyticsEvents.userId, userId));
    }

    if (options.includeSensors) {
      userSensors = await storage.getSensorReadings(userId);
    }

    return {
      bakeNotes: allNotes,
      bakePhotos: allPhotos.map(photo => ({
        ...photo,
        note: "Photo files must be requested separately for download"
      })),
      timelineSteps: allTimelineSteps,
      sensorReadings: userSensors,
      analytics: userAnalytics
    };
  }

  private static async gatherComplianceData(userId: string) {
    const auditTrail = await AuditService.getUserAuditTrail(userId);

    return {
      auditTrail,
      legalBasis: "Consent (GDPR Article 6.1.a) and Legitimate Interest (GDPR Article 6.1.f)",
      dataRetentionPolicy: "Personal data is retained for 7 years after account closure",
      rightsInformation: {
        rightToAccess: "You have the right to access your personal data",
        rightToRectification: "You have the right to correct inaccurate data",
        rightToErasure: "You have the right to request deletion of your data",
        rightToPortability: "You have the right to receive your data in a portable format",
        rightToObject: "You have the right to object to processing of your data"
      }
    };
  }

  private static calculateStatistics(user: any, bakingData: any) {
    return {
      totalRecipes: bakingData.recipes.length,
      totalBakes: bakingData.bakes.length,
      totalNotes: bakingData.bakeNotes.length,
      totalPhotos: bakingData.bakePhotos.length,
      accountAge: user.createdAt 
        ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) + ' days' 
        : 'Unknown'
    };
  }
}

export default DataExportService;