import { storage } from "../storage";
import { DataDeletionService, type DataSummary } from "./dataDeletionService";

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

export class ComplianceService {
  /**
   * Generate compliance report for a user
   */
  static async generateReport(userId: string): Promise<ComplianceReport> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const dataSummary = await DataDeletionService.getDataSummary(userId);

    return {
      userId,
      userEmail: user.email,
      dataCategories: this.buildDataCategories(dataSummary, user),
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

  private static buildDataCategories(dataSummary: DataSummary, user: any) {
    return [
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
      },
      {
        category: 'Sensor Data',
        recordCount: dataSummary.sensors,
        lastUpdated: new Date(),
        retentionPeriod: '1 year from collection'
      }
    ];
  }

  /**
   * Validate user data retention compliance
   */
  static async validateRetentionCompliance(userId: string): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check account age for retention compliance
    const accountAge = user.createdAt ? Date.now() - new Date(user.createdAt).getTime() : 0;
    const accountAgeYears = accountAge / (1000 * 60 * 60 * 24 * 365);

    if (accountAgeYears > 7) {
      issues.push('Account is older than 7 years - review retention policy');
      recommendations.push('Consider archiving or anonymizing old account data');
    }

    // Check for inactive accounts
    const lastLogin = user.updatedAt || user.createdAt;
    const daysSinceLastActivity = lastLogin ? 
      (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24) : 
      Infinity;

    if (daysSinceLastActivity > 730) { // 2 years
      issues.push('Account inactive for more than 2 years');
      recommendations.push('Consider sending data retention notification to user');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get GDPR rights information for users
   */
  static getRightsInformation() {
    return {
      rightToAccess: {
        description: "You have the right to access your personal data",
        howToExercise: "Request a data export through your account settings or contact support",
        timeframe: "We will respond within 30 days"
      },
      rightToRectification: {
        description: "You have the right to correct inaccurate data",
        howToExercise: "Update your information in account settings or contact support",
        timeframe: "Changes are effective immediately"
      },
      rightToErasure: {
        description: "You have the right to request deletion of your data",
        howToExercise: "Request account deletion through settings or contact support",
        timeframe: "Deletion will be completed within 30 days after confirmation"
      },
      rightToPortability: {
        description: "You have the right to receive your data in a portable format",
        howToExercise: "Request a data export in JSON, CSV, or other machine-readable format",
        timeframe: "Export will be available within 30 days"
      },
      rightToObject: {
        description: "You have the right to object to processing of your data",
        howToExercise: "Contact support to object to specific data processing activities",
        timeframe: "We will respond within 30 days and stop processing if no legitimate interest"
      },
      rightToRestrict: {
        description: "You have the right to restrict processing of your data",
        howToExercise: "Contact support to request processing restrictions",
        timeframe: "Restrictions will be applied within 30 days"
      }
    };
  }

  /**
   * Get legal basis information for data processing
   */
  static getLegalBasisInfo() {
    return {
      consent: {
        article: "GDPR Article 6.1.a",
        description: "Processing based on user consent",
        applies_to: ["Marketing communications", "Optional analytics", "Non-essential features"],
        withdrawal: "Consent can be withdrawn at any time through account settings"
      },
      contract: {
        article: "GDPR Article 6.1.b",
        description: "Processing necessary for contract performance",
        applies_to: ["Account management", "Service delivery", "Payment processing"],
        withdrawal: "Cannot be withdrawn as necessary for service provision"
      },
      legitimateInterest: {
        article: "GDPR Article 6.1.f",
        description: "Processing based on legitimate interests",
        applies_to: ["Security monitoring", "Service improvement", "Technical support"],
        balancing_test: "Interests balanced against user privacy rights"
      },
      legal_obligation: {
        article: "GDPR Article 6.1.c",
        description: "Processing required by legal obligation",
        applies_to: ["Tax records", "Audit trails", "Regulatory compliance"],
        retention: "Retained as required by applicable laws"
      }
    };
  }
}

export default ComplianceService;