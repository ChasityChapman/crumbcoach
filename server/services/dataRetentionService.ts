import { AuditService } from "./auditService";
import { DataDeletionService } from "./dataDeletionService";

export interface RetentionPolicy {
  category: string;
  retentionPeriod: number; // in days
  autoDeleteAfter?: number; // in days, if different from retention
  description: string;
  legalBasis: string;
}

export interface RetentionScanResult {
  category: string;
  recordsFound: number;
  recordsExpired: number;
  oldestRecord?: Date;
  recommendedAction: 'none' | 'review' | 'archive' | 'delete';
}

export class DataRetentionService {
  private static readonly RETENTION_POLICIES: RetentionPolicy[] = [
    {
      category: 'audit_logs',
      retentionPeriod: 7 * 365, // 7 years
      description: 'Audit and compliance logs',
      legalBasis: 'Legal obligation and legitimate interest'
    },
    {
      category: 'user_data',
      retentionPeriod: 7 * 365, // 7 years after account closure
      description: 'Personal and baking data',
      legalBasis: 'Contract and consent'
    },
    {
      category: 'analytics_events',
      retentionPeriod: 2 * 365, // 2 years
      autoDeleteAfter: 2 * 365,
      description: 'Usage analytics and tracking data',
      legalBasis: 'Legitimate interest'
    },
    {
      category: 'sensor_readings',
      retentionPeriod: 365, // 1 year
      autoDeleteAfter: 365,
      description: 'Environmental sensor data',
      legalBasis: 'Legitimate interest'
    },
    {
      category: 'session_data',
      retentionPeriod: 90, // 3 months
      autoDeleteAfter: 90,
      description: 'User session and authentication data',
      legalBasis: 'Contract and security'
    },
    {
      category: 'deletion_requests',
      retentionPeriod: 365, // 1 year
      autoDeleteAfter: 365,
      description: 'Data deletion request records',
      legalBasis: 'Legal obligation'
    }
  ];

  /**
   * Get all retention policies
   */
  static getRetentionPolicies(): RetentionPolicy[] {
    return [...this.RETENTION_POLICIES];
  }

  /**
   * Get retention policy for a specific category
   */
  static getRetentionPolicy(category: string): RetentionPolicy | undefined {
    return this.RETENTION_POLICIES.find(policy => policy.category === category);
  }

  /**
   * Run automated data retention cleanup
   */
  static async runRetentionCleanup(): Promise<{
    totalCleaned: number;
    cleanupResults: { category: string; cleaned: number }[];
  }> {
    console.log('🧹 Starting automated data retention cleanup');
    
    const cleanupResults: { category: string; cleaned: number }[] = [];
    let totalCleaned = 0;

    try {
      // Cleanup expired audit logs
      const auditCleaned = await AuditService.cleanupExpiredLogs();
      cleanupResults.push({ category: 'audit_logs', cleaned: auditCleaned });
      totalCleaned += auditCleaned;

      // Cleanup old deletion requests  
      const deletionRequestsCleaned = await DataDeletionService.cleanupExpiredRequests();
      cleanupResults.push({ category: 'deletion_requests', cleaned: deletionRequestsCleaned });
      totalCleaned += deletionRequestsCleaned;

      // TODO: Add cleanup for other data categories as needed
      // - Analytics events older than 2 years
      // - Sensor readings older than 1 year  
      // - Session data older than 3 months

      console.log(`✅ Data retention cleanup completed. Total records cleaned: ${totalCleaned}`);
      
      return {
        totalCleaned,
        cleanupResults
      };
    } catch (error) {
      console.error('Data retention cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Scan for data approaching retention limits
   */
  static async scanRetentionCompliance(): Promise<RetentionScanResult[]> {
    console.log('🔍 Scanning data retention compliance');
    
    const results: RetentionScanResult[] = [];

    try {
      // This is a placeholder implementation
      // In a real system, you would scan each data category
      for (const policy of this.RETENTION_POLICIES) {
        const result: RetentionScanResult = {
          category: policy.category,
          recordsFound: 0,
          recordsExpired: 0,
          recommendedAction: 'none'
        };

        // TODO: Implement actual scanning logic for each category
        switch (policy.category) {
          case 'audit_logs':
            // Scan audit logs table
            break;
          case 'analytics_events':
            // Scan analytics events table
            break;
          case 'sensor_readings':
            // Scan sensor readings table
            break;
          // Add other categories...
        }

        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Retention compliance scan failed:', error);
      throw error;
    }
  }

  /**
   * Generate retention policy report
   */
  static generateRetentionReport(): {
    policies: RetentionPolicy[];
    summary: {
      totalCategories: number;
      avgRetentionDays: number;
      autoDeleteEnabled: number;
    };
  } {
    const policies = this.getRetentionPolicies();
    
    const avgRetentionDays = policies.reduce((sum, policy) => sum + policy.retentionPeriod, 0) / policies.length;
    const autoDeleteEnabled = policies.filter(policy => policy.autoDeleteAfter).length;

    return {
      policies,
      summary: {
        totalCategories: policies.length,
        avgRetentionDays: Math.round(avgRetentionDays),
        autoDeleteEnabled
      }
    };
  }

  /**
   * Validate retention policy compliance for specific data
   */
  static validateRetention(category: string, dataAge: number): {
    compliant: boolean;
    policy: RetentionPolicy | undefined;
    daysRemaining: number;
    action: 'retain' | 'review' | 'delete';
  } {
    const policy = this.getRetentionPolicy(category);
    
    if (!policy) {
      return {
        compliant: false,
        policy: undefined,
        daysRemaining: 0,
        action: 'review'
      };
    }

    const daysRemaining = policy.retentionPeriod - dataAge;
    const autoDeleteDays = policy.autoDeleteAfter || policy.retentionPeriod;
    
    let action: 'retain' | 'review' | 'delete';
    let compliant = true;

    if (dataAge >= autoDeleteDays) {
      action = 'delete';
      compliant = false;
    } else if (dataAge >= policy.retentionPeriod * 0.9) { // 90% of retention period
      action = 'review';
    } else {
      action = 'retain';
    }

    return {
      compliant,
      policy,
      daysRemaining: Math.max(0, daysRemaining),
      action
    };
  }

  /**
   * Schedule retention cleanup job
   */
  static scheduleRetentionCleanup(intervalHours = 24): NodeJS.Timeout {
    console.log(`📅 Scheduling retention cleanup to run every ${intervalHours} hours`);
    
    return setInterval(async () => {
      try {
        await this.runRetentionCleanup();
      } catch (error) {
        console.error('Scheduled retention cleanup failed:', error);
      }
    }, intervalHours * 60 * 60 * 1000);
  }
}

export default DataRetentionService;