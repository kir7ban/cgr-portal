import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DatabaseService, AuditEntry } from '../database/database.service';

/**
 * Audit trail filter options
 */
export interface AuditFilterOptions {
  dateFrom?: string; // ISO 8601 date string (inclusive)
  dateTo?: string; // ISO 8601 date string (inclusive)
  actor?: string; // Filter by user/actor ID
  action?: string; // Filter by action type (e.g., POST_APPROVED, POST_REJECTED)
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number; // 1-based page number
  pageSize: number; // Number of items per page (max 100)
}

/**
 * Paginated audit trail response
 */
export interface PaginatedAuditResponse {
  entries: AuditEntry[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * AuditTrailService: Retrieve immutable audit trail entries with filtering and pagination.
 *
 * Responsibilities:
 * - Enforce admin-only access to audit trail
 * - Filter audit entries by date, actor, and action
 * - Implement pagination (offset-based)
 * - Sort chronologically (newest first)
 * - Validate filter and pagination parameters
 *
 * Key Features:
 * - Immutable append-only audit logs (no modifications, no deletions allowed)
 * - Date range filtering (inclusive on both ends)
 * - Actor filtering (user/service ID who performed the action)
 * - Action type filtering (POST_APPROVED, COMMENT_DELETED, etc.)
 * - 3-year retention for compliance
 * - Admin-only read access
 */
@Injectable()
export class AuditTrailService {
  private auditEntries: AuditEntry[] = [];

  constructor(private databaseService: DatabaseService) {}

  /**
   * Retrieve audit trail entries with optional filters and pagination.
   *
   * @param userId - User requesting the audit trail (must be admin)
   * @param pagination - Pagination parameters (page, pageSize)
   * @param filters - Optional filter options (dateFrom, dateTo, actor, action)
   * @returns Paginated audit trail response with entries visible to admin
   *
   * @throws ForbiddenException if user is not an admin
   * @throws BadRequestException if pagination or filter params are invalid
   *
   * Sorting: Chronological (newest first) by timestamp
   *
   * Access Control:
   * - Admin-only read access to complete audit trail
   * - Non-admin users are denied access
   *
   * Filtering:
   * - dateFrom: ISO 8601 string, inclusive (entries >= dateFrom)
   * - dateTo: ISO 8601 string, inclusive (entries <= dateTo)
   * - actor: Filter by user/service ID who performed the action
   * - action: Filter by action type (e.g., POST_APPROVED, COMMENT_DELETED)
   *
   * Pagination:
   * - Page: 1-based page number (starts at 1)
   * - PageSize: 1-100 items per page (default: 20)
   *
   * Example:
   * ```
   * getAuditTrail('admin-user', { page: 1, pageSize: 50 }, {
   *   dateFrom: '2026-07-01T00:00:00Z',
   *   dateTo: '2026-07-13T23:59:59Z',
   *   actor: 'alice.smith',
   *   action: 'POST_APPROVED'
   * })
   * ```
   */
  async getAuditTrail(
    userId: string,
    pagination: PaginationParams,
    filters?: AuditFilterOptions,
  ): Promise<PaginatedAuditResponse> {
    // Step 1: Enforce admin-only access
    if (!this.isAdmin(userId)) {
      throw new ForbiddenException('Only admins can access audit trail');
    }

    // Step 2: Validate pagination parameters
    this.validatePaginationParams(pagination);

    // Step 3: Get all audit entries from database
    const allEntries = await this.fetchAuditEntries();

    // Step 4: Apply filters
    let filteredEntries = allEntries;

    if (filters) {
      filteredEntries = this.applyFilters(filteredEntries, filters);
    }

    // Step 5: Sort chronologically (newest first)
    filteredEntries.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA; // Descending order
    });

    // Step 6: Implement pagination
    const totalCount = filteredEntries.length;
    const pageNumber = pagination.page;
    const pageSize = pagination.pageSize;
    const totalPages = Math.ceil(totalCount / pageSize);

    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageEntries = filteredEntries.slice(startIndex, endIndex);

    return {
      entries: pageEntries,
      totalCount,
      pageNumber,
      pageSize,
      totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPreviousPage: pageNumber > 1,
    };
  }

  /**
   * Fetch all audit entries from the database
   *
   * @returns Array of all audit entries
   * @throws Error if database is not connected
   */
  private async fetchAuditEntries(): Promise<AuditEntry[]> {
    if (!this.databaseService.isConnected()) {
      throw new Error('Database not connected');
    }

    // In production, this would query the CosmosDB auditLogs collection
    // For MVP, we use in-memory storage via DatabaseService
    return this.auditEntries;
  }

  /**
   * Apply filters to audit entries
   *
   * Supported filters:
   * - dateFrom: ISO 8601 string, inclusive
   * - dateTo: ISO 8601 string, inclusive
   * - actor: Exact match on actor (user/service ID)
   * - action: Exact match on action type
   *
   * @param entries - Array of audit entries to filter
   * @param filters - Filter options to apply
   * @returns Filtered array of audit entries
   * @throws BadRequestException if filter values are invalid
   */
  private applyFilters(entries: AuditEntry[], filters: AuditFilterOptions): AuditEntry[] {
    let filtered = entries;

    // Filter by date range
    if (filters.dateFrom || filters.dateTo) {
      const dateFrom = filters.dateFrom ? new Date(filters.dateFrom).getTime() : -Infinity;
      const dateTo = filters.dateTo ? new Date(filters.dateTo).getTime() : Infinity;

      // Validate date format
      if (filters.dateFrom && isNaN(dateFrom)) {
        throw new BadRequestException('Invalid dateFrom format, must be ISO 8601');
      }
      if (filters.dateTo && isNaN(dateTo)) {
        throw new BadRequestException('Invalid dateTo format, must be ISO 8601');
      }

      filtered = filtered.filter((entry) => {
        const entryTime = new Date(entry.timestamp).getTime();
        return entryTime >= dateFrom && entryTime <= dateTo;
      });
    }

    // Filter by actor
    if (filters.actor) {
      if (typeof filters.actor !== 'string' || filters.actor.trim().length === 0) {
        throw new BadRequestException('Actor must be a non-empty string');
      }
      filtered = filtered.filter((entry) => entry.actor === filters.actor);
    }

    // Filter by action
    if (filters.action) {
      if (typeof filters.action !== 'string' || filters.action.trim().length === 0) {
        throw new BadRequestException('Action must be a non-empty string');
      }
      filtered = filtered.filter((entry) => entry.action === filters.action);
    }

    return filtered;
  }

  /**
   * Check if a user has admin role
   *
   * In MVP, this is a simple check. In production, would verify against
   * Azure Entra roles or internal role database.
   *
   * @param userId - User ID to check
   * @returns true if user is an admin
   */
  private isAdmin(userId: string): boolean {
    // MVP: Hard-coded admins for testing
    const adminUsers = ['admin', 'admin@bosch.com'];
    return adminUsers.includes(userId);
  }

  /**
   * Validate pagination parameters
   *
   * @param pagination - Pagination params to validate
   * @throws BadRequestException if params are invalid
   */
  private validatePaginationParams(pagination: PaginationParams): void {
    if (!pagination || typeof pagination !== 'object') {
      throw new BadRequestException('Pagination params required');
    }

    if (typeof pagination.page !== 'number' || pagination.page < 1) {
      throw new BadRequestException('Page must be a positive integer');
    }

    if (typeof pagination.pageSize !== 'number' || pagination.pageSize < 1) {
      throw new BadRequestException('PageSize must be a positive integer');
    }

    if (pagination.pageSize > 100) {
      throw new BadRequestException('PageSize cannot exceed 100');
    }
  }

  /**
   * Add an audit entry (internal use only)
   *
   * Note: This method is for internal use by other services to log actions.
   * Public API access to audit trail is read-only via getAuditTrail().
   *
   * @param entry - Audit entry to add
   * @returns The added entry
   */
  async addAuditEntry(entry: AuditEntry): Promise<AuditEntry> {
    await this.databaseService.insertAudit(entry);
    this.auditEntries.push(entry);
    return entry;
  }
}
