import { Injectable } from '@nestjs/common';
import { DatabaseService, AuditEntry } from './database.service';

/**
 * Parameters for logging an audit action
 */
export interface LogActionParams {
  actor: string;
  action: string;
  resource: string;
  resourceId?: string;
}

/**
 * AuditingService: Centralized audit logging service to eliminate boilerplate.
 *
 * Responsibilities:
 * - Generate unique audit entry IDs
 * - Create timestamped audit entries
 * - Persist audit entries to database
 * - Return created audit entry
 *
 * Benefits:
 * - Eliminates 5+ line audit boilerplate across services
 * - Ensures consistent audit entry structure
 * - Centralizes ID generation logic
 * - Simplifies service code
 *
 * Usage:
 * ```typescript
 * // Before (5+ lines):
 * await this.databaseService.insertAudit({
 *   id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 *   timestamp: new Date().toISOString(),
 *   actor: userId,
 *   action: 'approve_post',
 *   resource: 'submission',
 *   resourceId: submissionId,
 * });
 *
 * // After (1 line):
 * await this.auditingService.logAction({
 *   actor: userId,
 *   action: 'approve_post',
 *   resource: 'submission',
 *   resourceId: submissionId,
 * });
 * ```
 */
@Injectable()
export class AuditingService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Log an audit action with automatic ID and timestamp generation.
   *
   * @param params - Action parameters (actor, action, resource, resourceId)
   * @returns Created audit entry with generated ID and timestamp
   *
   * @example
   * ```typescript
   * const entry = await auditingService.logAction({
   *   actor: 'admin-user',
   *   action: 'revoke_post',
   *   resource: 'post',
   *   resourceId: 'post-123',
   * });
   * // Returns:
   * // {
   * //   id: 'audit-1689123456789-abc123def',
   * //   timestamp: '2024-07-13T10:30:45.123Z',
   * //   actor: 'admin-user',
   * //   action: 'revoke_post',
   * //   resource: 'post',
   * //   resourceId: 'post-123'
   * // }
   * ```
   */
  async logAction(params: LogActionParams): Promise<AuditEntry> {
    const auditEntry: AuditEntry = {
      id: this.generateAuditId(),
      timestamp: new Date().toISOString(),
      actor: params.actor,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
    };

    return await this.databaseService.insertAudit(auditEntry);
  }

  /**
   * Generate a unique audit entry ID.
   * Format: audit-{timestamp}-{random}
   *
   * @private
   * @returns Unique audit ID string
   */
  private generateAuditId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
