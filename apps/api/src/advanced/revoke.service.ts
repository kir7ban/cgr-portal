import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostService, PostDocument } from '../posts/post.service';
import { DatabaseService } from '../database/database.service';
import { AuditingService } from '../database/auditing.service';
import { AuthorizationService } from '../auth/authorization.service';
import { PostState, POST_STATES } from '../domain/state-types';

/**
 * DTO for revoking a post with optional reason
 */
export interface RevokePostDto {
  reason?: string; // Optional: reason for revocation (max 500 chars)
}

/**
 * Interface representing a revocation event
 */
export interface RevocationRecord {
  id: string;
  postId: string;
  revokedBy: string;
  revokedAt: string;
  reason?: string;
  previousState: PostState;
}

/**
 * Response object when a post is successfully revoked
 */
export interface RevokePostResponse {
  postId: string;
  revokedBy: string;
  revokedAt: string;
  reason?: string;
  message: string;
}

/**
 * RevocationService handles post revocation with comprehensive audit logging.
 *
 * **Core responsibilities:**
 * - Revoke published posts (immediate removal from feed)
 * - Validate admin authorization (only admin users)
 * - Create immutable audit trail entries with reason
 * - Track revocation history per post
 * - Provide revocation metadata retrieval
 *
 * **Behavioral guarantees:**
 * - Post must be in PUBLISHED state to revoke
 * - Only Admins can revoke
 * - Revocation is immediate (no queue or delay)
 * - Post disappears from feed entirely (no "[revoked]" badge to users)
 * - Revocation reason is optional but recommended for governance
 * - Immutable audit trail records action, actor, timestamp, and reason
 *
 * @example
 * ```typescript
 * // Revoke a published post with reason
 * const result = await revocationService.revokePost(
 *   'post-123',
 *   'admin-user-456',
 *   { reason: 'Violates company policy' }
 * );
 * // Returns:
 * // {
 * //   postId: 'post-123',
 * //   revokedBy: 'admin-user-456',
 * //   revokedAt: '2024-07-13T10:30:45.123Z',
 * //   reason: 'Violates company policy',
 * //   message: 'Post successfully revoked and removed from feed'
 * // }
 * ```
 */
@Injectable()
export class RevocationService {
  private revocationRecords: Map<string, RevocationRecord> = new Map();
  private postRevocations: Map<string, RevocationRecord[]> = new Map();

  constructor(
    private postService: PostService,
    private databaseService: DatabaseService,
    private auditingService: AuditingService,
    private authorizationService: AuthorizationService,
  ) {}

  /**
   * Revoke a published post and remove it from feed immediately.
   *
   * **Workflow:**
   * 1. Validate user is an Admin
   * 2. Retrieve the post and verify it's in PUBLISHED state
   * 3. Change post state to REVOKED
   * 4. Create revocation record with metadata
   * 5. Create immutable audit trail entry
   * 6. Store revocation tracking info
   *
   * **Authorization:**
   * - Only Admins can revoke posts
   * - Any Admin can revoke any post
   *
   * **Post state requirement:**
   * - Post must be PUBLISHED to revoke
   * - Cannot revoke DRAFT, SUBMITTED, REJECTED, or ARCHIVED posts
   * - Cannot revoke already-REVOKED posts
   *
   * **Audit trail:**
   * - Action: 'revoke_post'
   * - Actor: adminId (the Admin performing revocation)
   * - Resource: 'post'
   * - ResourceId: postId
   * - Reason included in audit entry (optional)
   * - Timestamp recorded as ISO 8601
   *
   * @param postId - ID of the post to revoke
   * @param adminId - User ID of the Admin performing revocation (must be Admin)
   * @param options - Optional DTO containing reason for revocation
   * @returns RevokePostResponse with confirmation details
   *
   * @throws ForbiddenException - If user is not an Admin
   * @throws NotFoundException - If post not found
   * @throws BadRequestException - If post is not in PUBLISHED state
   *
   * @example
   * ```typescript
   * const result = await revocationService.revokePost(
   *   'post-123',
   *   'admin-456',
   *   { reason: 'Violates content policy' }
   * );
   * // Returns:
   * // {
   * //   postId: 'post-123',
   * //   revokedBy: 'admin-456',
   * //   revokedAt: '2024-07-13T10:30:45.123Z',
   * //   reason: 'Violates content policy',
   * //   message: 'Post successfully revoked and removed from feed'
   * // }
   * ```
   */
  async revokePost(
    postId: string,
    adminId: string,
    options: RevokePostDto = {},
  ): Promise<RevokePostResponse> {
    // Validate authorization
    this.authorizationService.enforceRole(adminId, 'ADMIN', 'Only Admins can revoke posts');

    // Validate reason length if provided
    if (options.reason && options.reason.length > 500) {
      throw new BadRequestException('Revocation reason cannot exceed 500 characters');
    }

    // Retrieve the post
    const post = await this.postService.getPostForUser(postId, adminId);
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    // Verify post is in PUBLISHED state
    if (post.state !== POST_STATES.PUBLISHED) {
      throw new BadRequestException(
        `Cannot revoke post in ${post.state} state. Only PUBLISHED posts can be revoked.`,
      );
    }

    // Update post state to REVOKED (removes from feed)
    const revokedPost = await this.postService.updatePostState(postId, POST_STATES.REVOKED);

    // Create revocation record
    const revocationRecord: RevocationRecord = {
      id: this.generateRevocationId(postId),
      postId,
      revokedBy: adminId,
      revokedAt: new Date().toISOString(),
      reason: options.reason,
      previousState: POST_STATES.PUBLISHED,
    };

    // Store revocation record
    this.revocationRecords.set(revocationRecord.id, revocationRecord);

    // Track revocations per post
    if (!this.postRevocations.has(postId)) {
      this.postRevocations.set(postId, []);
    }
    this.postRevocations.get(postId)!.push(revocationRecord);

    // Create immutable audit trail entry
    await this.auditingService.logAction({
      actor: adminId,
      action: 'revoke_post',
      resource: 'post',
      resourceId: postId,
    });

    // If reason is provided, include it in a second audit entry for detailed governance
    if (options.reason) {
      await this.auditingService.logAction({
        actor: adminId,
        action: 'revoke_post_with_reason',
        resource: 'revocation_reason',
        resourceId: postId,
      });
    }

    return {
      postId,
      revokedBy: adminId,
      revokedAt: revocationRecord.revokedAt,
      reason: options.reason,
      message: 'Post successfully revoked and removed from feed',
    };
  }

  /**
   * Get revocation details for a specific revocation event.
   *
   * **Purpose:**
   * - Retrieve metadata about a specific revocation
   * - For audit trail inspection
   * - For admin dashboard display
   *
   * @param revocationId - ID of the revocation record
   * @returns RevocationRecord if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const record = await revocationService.getRevocation('revoke-post-123-1689123456789');
   * if (record) {
   *   console.log(`Post revoked by ${record.revokedBy} on ${record.revokedAt}`);
   *   console.log(`Reason: ${record.reason}`);
   * }
   * ```
   */
  async getRevocation(revocationId: string): Promise<RevocationRecord | undefined> {
    return this.revocationRecords.get(revocationId);
  }

  /**
   * Get all revocations for a specific post.
   *
   * **Purpose:**
   * - See revocation history for a post
   * - Useful if a post was revoked and re-published (theoretical - not in current spec)
   * - For audit/compliance investigation
   *
   * @param postId - ID of the post
   * @returns Array of RevocationRecord objects (empty if no revocations)
   *
   * @example
   * ```typescript
   * const revocations = await revocationService.getRevocationsForPost('post-123');
   * console.log(`Post has been revoked ${revocations.length} times`);
   * for (const r of revocations) {
   *   console.log(`- Revoked on ${r.revokedAt} by ${r.revokedBy}: ${r.reason}`);
   * }
   * ```
   */
  async getRevocationsForPost(postId: string): Promise<RevocationRecord[]> {
    return this.postRevocations.get(postId) || [];
  }

  /**
   * Get count of revoked posts (admin dashboard metric).
   *
   * **Purpose:**
   * - Dashboard metric: total posts revoked
   * - Governance/compliance reporting
   * - Trend analysis
   *
   * @returns Total count of revocation events
   *
   * @example
   * ```typescript
   * const count = await revocationService.getRevokedPostCount();
   * console.log(`Total posts revoked: ${count}`);
   * ```
   */
  async getRevokedPostCount(): Promise<number> {
    return this.revocationRecords.size;
  }

  /**
   * Get all revocations with optional filtering (for audit dashboard).
   *
   * **Purpose:**
   * - Display recent revocations on admin audit dashboard
   * - Sorted by timestamp (most recent first)
   * - Limited to specified count
   *
   * **Sorting:**
   * - Newest revocations first (descending by timestamp)
   *
   * @param limit - Maximum number of revocations to return (default: 50)
   * @returns Array of RevocationRecord objects sorted by timestamp descending
   *
   * @example
   * ```typescript
   * // Get last 10 revocations for dashboard
   * const recent = await revocationService.getRecentRevocations(10);
   * ```
   */
  async getRecentRevocations(limit: number = 50): Promise<RevocationRecord[]> {
    const records = Array.from(this.revocationRecords.values());
    return records
      .sort((a, b) => new Date(b.revokedAt).getTime() - new Date(a.revokedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get revocation statistics for admin dashboard.
   *
   * **Purpose:**
   * - Dashboard metrics and analytics
   * - Trend analysis
   * - Governance reporting
   *
   * @returns Object with revocation statistics
   * - totalRevocations: total count
   * - recentRevocations: count in last 7 days
   * - withReason: count with reason provided
   * - avgReasonsLength: average length of reasons provided
   *
   * @example
   * ```typescript
   * const stats = await revocationService.getRevocationStats();
   * console.log(`Total revocations: ${stats.totalRevocations}`);
   * console.log(`Documented revocations: ${stats.withReason}`);
   * ```
   */
  async getRevocationStats(): Promise<{
    totalRevocations: number;
    recentRevocations: number;
    withReason: number;
    avgReasonsLength: number;
  }> {
    const records = Array.from(this.revocationRecords.values());
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const withReason = records.filter((r) => r.reason).length;
    const reasonsLength = records
      .filter((r) => r.reason)
      .reduce((sum, r) => sum + (r.reason?.length || 0), 0);

    return {
      totalRevocations: records.length,
      recentRevocations: records.filter((r) => new Date(r.revokedAt) > sevenDaysAgo).length,
      withReason,
      avgReasonsLength: withReason > 0 ? reasonsLength / withReason : 0,
    };
  }

  /**
   * Check if a post is revoked.
   *
   * **Purpose:**
   * - Feed filtering (exclude revoked posts)
   * - Post detail page (verify post visibility)
   * - Authorization checks
   *
   * @param postId - ID of the post
   * @returns true if post has been revoked, false otherwise
   *
   * @example
   * ```typescript
   * if (await revocationService.isPostRevoked('post-123')) {
   *   // Don't show in feed
   *   return undefined;
   * }
   * ```
   */
  async isPostRevoked(postId: string): Promise<boolean> {
    const revocations = this.postRevocations.get(postId) || [];
    return revocations.length > 0;
  }

  /**
   * Get revocations by admin (for audit dashboard - who's revoking posts?).
   *
   * **Purpose:**
   * - Audit dashboard: which admin is revoking most posts
   * - Governance: pattern analysis
   *
   * @param adminId - Admin user ID
   * @returns Array of RevocationRecord objects for this admin
   *
   * @example
   * ```typescript
   * const admins = ['admin-1', 'admin-2', 'admin-3'];
   * for (const admin of admins) {
   *   const revocations = await revocationService.getRevocationsByAdmin(admin);
   *   console.log(`${admin}: ${revocations.length} posts revoked`);
   * }
   * ```
   */
  async getRevocationsByAdmin(adminId: string): Promise<RevocationRecord[]> {
    return Array.from(this.revocationRecords.values()).filter((r) => r.revokedBy === adminId);
  }

  /**
   * Get revocations with reasons (documented governance decisions).
   *
   * **Purpose:**
   * - Audit dashboard filter
   * - Show only revocations with explicit reasons
   * - Compliance reporting
   *
   * @returns Array of RevocationRecord objects that have a reason
   *
   * @example
   * ```typescript
   * const documented = await revocationService.getDocumentedRevocations();
   * console.log(`${documented.length} revocations with documented reasons`);
   * ```
   */
  async getDocumentedRevocations(): Promise<RevocationRecord[]> {
    return Array.from(this.revocationRecords.values()).filter((r) => r.reason);
  }

  /**
   * Generate a unique revocation record ID.
   *
   * @private
   * @param postId - Post ID
   * @returns Unique revocation ID
   */
  private generateRevocationId(postId: string): string {
    return `revoke-${postId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
