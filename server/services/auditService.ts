import { db } from "../db";
import { accountAuditLog, type InsertAccountAuditLog } from "../../shared/schema";
import { sql } from "drizzle-orm";
import { Request } from "express";

export interface AuditEventOptions {
  userId: string;
  userEmail: string;
  action: string;
  category: string;
  details: any;
  req?: Request;
  success?: boolean;
  errorMessage?: string;
  performedBy?: string;
}

export class AuditService {
  /**
   * Log an audit event for compliance tracking
   */
  static async logEvent(options: AuditEventOptions): Promise<void> {
    const {
      userId,
      userEmail,
      action,
      category,
      details,
      req,
      success = true,
      errorMessage,
      performedBy = 'user'
    } = options;

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
        performedBy,
        retentionDate: this.calculateRetentionDate(),
      };

      await db.insert(accountAuditLog).values(auditData);
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Calculate retention date for audit records (7 years for GDPR compliance)
   */
  static calculateRetentionDate(): Date {
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 7);
    return retentionDate;
  }

  /**
   * Clean up expired audit logs
   */
  static async cleanupExpiredLogs(): Promise<number> {
    const now = new Date();

    try {
      const result = await db.delete(accountAuditLog)
        .where(sql`${accountAuditLog.retentionDate} IS NOT NULL AND ${accountAuditLog.retentionDate} < ${now}`);
      
      const cleaned = result.rowCount || 0;
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired audit logs`);
      }
      return cleaned;
    } catch (error) {
      console.error('Failed to clean up expired audit logs:', error);
      return 0;
    }
  }

  /**
   * Get audit trail for a user
   */
  static async getUserAuditTrail(userId: string, limit = 100) {
    try {
      const auditTrail = await db.select()
        .from(accountAuditLog)
        .where(sql`${accountAuditLog.userId} = ${userId}`)
        .orderBy(sql`${accountAuditLog.timestamp} DESC`)
        .limit(limit);

      return auditTrail.map(log => ({
        action: log.action,
        timestamp: log.timestamp,
        ipAddress: log.ipAddress ? "***.***.***." + log.ipAddress.split('.').pop() : null, // Partially masked
        success: log.success
      }));
    } catch (error) {
      console.error('Failed to get user audit trail:', error);
      return [];
    }
  }
}

export default AuditService;