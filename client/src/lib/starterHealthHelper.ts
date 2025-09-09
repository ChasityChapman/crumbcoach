import { safeStarterLogQueries } from './safeQueries';
import type { StarterLog, HealthSnapshot } from '@shared/schema';
import type { StarterCondition } from './timeline';

/**
 * Helper functions for determining starter health and condition
 */
export class StarterHealthHelper {
  /**
   * Get the most recent starter condition based on logs
   */
  static async getCurrentStarterCondition(starterId?: string): Promise<StarterCondition | null> {
    try {
      // Get all starter logs, sorted by most recent
      const starterLogs = await safeStarterLogQueries.getAll();
      
      if (!starterLogs || starterLogs.length === 0) {
        return null;
      }

      // Filter by starter ID if provided, otherwise use most recent log
      const relevantLogs = starterId 
        ? starterLogs.filter(log => log.starterId === starterId)
        : starterLogs;

      if (relevantLogs.length === 0) {
        return null;
      }

      // Sort by most recent (assuming createdAt or logDate field)
      const sortedLogs = relevantLogs.sort((a, b) => {
        const dateA = new Date(a.logDate || a.createdAt);
        const dateB = new Date(b.logDate || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      const mostRecentLog = sortedLogs[0];

      // Determine health status based on recent activity
      const healthStatus = this.assessHealthStatus(mostRecentLog, sortedLogs);
      
      // Map starter stage from the log
      const stage = this.mapStarterStage(mostRecentLog);

      // Determine activity level
      const activityLevel = this.assessActivityLevel(mostRecentLog);

      // Get rise time from recent logs
      const riseTimeHours = mostRecentLog.riseTimeHours || undefined;

      return {
        healthStatus,
        stage,
        riseTimeHours,
        activityLevel
      };

    } catch (error) {
      console.warn('Failed to get starter condition:', error);
      return null;
    }
  }

  /**
   * Assess starter health status based on recent logs
   */
  private static assessHealthStatus(
    recentLog: StarterLog, 
    allLogs: StarterLog[]
  ): HealthSnapshot['status'] {
    // Check if there are any concerning patterns
    const hasSlowRise = recentLog.riseTimeHours && recentLog.riseTimeHours > 10;
    const hasLowActivity = recentLog.peakActivity === false;
    
    // Look at condition notes for keywords
    const conditionNotes = recentLog.conditionNotes?.toLowerCase() || '';
    const hasNegativeNotes = conditionNotes.includes('sluggish') || 
                            conditionNotes.includes('slow') ||
                            conditionNotes.includes('weak') ||
                            conditionNotes.includes('smell') ||
                            conditionNotes.includes('mold');

    // Check consistency across recent logs
    const recentLogs = allLogs.slice(0, 3); // Last 3 logs
    const inconsistentRises = recentLogs.some(log => 
      log.riseTimeHours && Math.abs((log.riseTimeHours || 0) - (recentLog.riseTimeHours || 0)) > 3
    );

    if (hasNegativeNotes || (hasSlowRise && hasLowActivity)) {
      return 'sluggish';
    } else if (hasSlowRise || hasLowActivity || inconsistentRises) {
      return 'watch';
    } else {
      return 'healthy';
    }
  }

  /**
   * Map starter stage from log data
   */
  private static mapStarterStage(log: StarterLog): StarterCondition['stage'] {
    // Map from the starterStage field in the log
    switch (log.starterStage) {
      case 'just_fed':
        return 'just_fed';
      case 'peak':
        return 'peak';
      case 'collapsing':
        return 'collapsing';
      case 'sluggish':
        return 'sluggish';
      default:
        // Default to just_fed if no stage specified
        return 'just_fed';
    }
  }

  /**
   * Assess activity level based on log data
   */
  private static assessActivityLevel(log: StarterLog): StarterCondition['activityLevel'] {
    const riseTime = log.riseTimeHours || 8; // Default assumption
    const peakActivity = log.peakActivity;

    if (peakActivity === false || riseTime > 10) {
      return 'low';
    } else if (peakActivity === true && riseTime < 6) {
      return 'high';
    } else {
      return 'moderate';
    }
  }

  /**
   * Generate demo starter condition for testing
   */
  static getDemoStarterCondition(scenario: 'healthy' | 'sluggish' | 'watch' = 'healthy'): StarterCondition {
    const conditions: Record<string, StarterCondition> = {
      healthy: {
        healthStatus: 'healthy',
        stage: 'peak',
        riseTimeHours: 6.5,
        activityLevel: 'high'
      },
      sluggish: {
        healthStatus: 'sluggish',
        stage: 'sluggish',
        riseTimeHours: 12,
        activityLevel: 'low'
      },
      watch: {
        healthStatus: 'watch',
        stage: 'collapsing',
        riseTimeHours: 9,
        activityLevel: 'moderate'
      }
    };

    return conditions[scenario];
  }
}