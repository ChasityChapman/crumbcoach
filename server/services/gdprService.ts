import { Request } from "express";
import { AuditService } from "./auditService";
import { DataExportService, type DataExportOptions, type UserExportData } from "./dataExportService";
import { DataDeletionService, type DeletionSummary } from "./dataDeletionService";
import { ComplianceService, type ComplianceReport } from "./complianceService";
import { DataRetentionService } from "./dataRetentionService";

// Re-export types from individual services for backward compatibility
export type { DataExportOptions, UserExportData } from "./dataExportService";
export type { DeletionSummary } from "./dataDeletionService";
export type { ComplianceReport } from "./complianceService";

/**
 * GDPR Service - Orchestrates data protection and privacy compliance operations
 * 
 * This service acts as a facade for specialized GDPR-related services:
 * - AuditService: Handles audit logging and compliance tracking
 * - DataExportService: Manages data portability and export requests
 * - DataDeletionService: Handles data deletion and anonymization
 * - ComplianceService: Generates compliance reports and validation
 * - DataRetentionService: Manages data retention policies and cleanup
 */
export class GDPRService {
  /**
   * Log an audit event for compliance tracking
   * @deprecated Use AuditService.logEvent() directly for new code
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
    return AuditService.logEvent({
      userId,
      userEmail,
      action,
      category,
      details,
      req,
      success,
      errorMessage
    });
  }

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
    return DataExportService.exportUserData(userId, options);
  }

  /**
   * Create a data deletion request with confirmation token
   */
  static async requestDataDeletion(
    userId: string,
    requestType: 'full_deletion' | 'anonymization' = 'full_deletion',
    req?: Request
  ): Promise<{ requestId: string; confirmationToken: string; expiresAt: Date }> {
    return DataDeletionService.requestDataDeletion(userId, requestType, req);
  }

  /**
   * Confirm and process data deletion request
   */
  static async confirmDataDeletion(
    confirmationToken: string,
    req?: Request
  ): Promise<DeletionSummary> {
    return DataDeletionService.confirmDataDeletion(confirmationToken, req);
  }

  /**
   * Get summary of user data for deletion planning
   */
  static async getDataSummary(userId: string) {
    return DataDeletionService.getDataSummary(userId);
  }

  /**
   * Generate compliance report for a user
   */
  static async generateComplianceReport(userId: string): Promise<ComplianceReport> {
    return ComplianceService.generateReport(userId);
  }

  /**
   * Clean up expired data according to retention policies
   */
  static async cleanupExpiredData(): Promise<number> {
    const result = await DataRetentionService.runRetentionCleanup();
    return result.totalCleaned;
  }

  /**
   * Get GDPR rights information for users
   */
  static getRightsInformation() {
    return ComplianceService.getRightsInformation();
  }

  /**
   * Get legal basis information for data processing
   */
  static getLegalBasisInfo() {
    return ComplianceService.getLegalBasisInfo();
  }

  /**
   * Generate retention policy report
   */
  static generateRetentionReport() {
    return DataRetentionService.generateRetentionReport();
  }

  /**
   * Validate retention compliance for a user
   */
  static async validateRetentionCompliance(userId: string) {
    return ComplianceService.validateRetentionCompliance(userId);
  }

  /**
   * Schedule automated retention cleanup
   */
  static scheduleRetentionCleanup(intervalHours = 24) {
    return DataRetentionService.scheduleRetentionCleanup(intervalHours);
  }
}

export default GDPRService;