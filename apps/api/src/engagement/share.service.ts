import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditingService } from '../database/auditing.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * ShareDto - Data transfer object for share requests
 * Contains post ID and recipient list for internal sharing
 */
export interface ShareDto {
  postId: string;
  recipientIds: string[];
}

/**
 * Share - Internal representation of a share event
 * Immutable record of post being shared with recipients
 */
export interface Share {
  id: string;
  postId: string;
  sharedBy: string;
  sharedWith: string[];
  sharedAt: string;
  recipientCount: number;
}

/**
 * ShareService
 * Handles internal post sharing with comprehensive audit logging.
 *
 * Features:
 * - Share posts with other employees (internal-only)
 * - Audit trail logging of all share events
 * - Validation of post existence and visibility
 * - Recipient list management
 *
 * Audit trail records:
 * - action: 'share_post'
 * - actor: userId (the person sharing)
 * - resource: 'post'
 * - resourceId: postId
 * - Additional metadata: recipient count, list of recipients
 */
@Injectable()
export class ShareService {
  private readonly logger = new Logger(ShareService.name);
  private shares: Map<string, Share> = new Map();
  private sharesByPost: Map<string, string[]> = new Map();
  private sharesByUser: Map<string, string[]> = new Map();

  constructor(
    private databaseService: DatabaseService,
    private auditingService: AuditingService,
  ) {}

  /**
   * Share a post with one or more recipients
   * Creates immutable audit trail entry for compliance
   *
   * @param postId - The ID of the post to share
   * @param userId - The ID of the user sharing the post
   * @param recipientIds - Array of recipient user IDs
   * @returns Share object with metadata
   * @throws BadRequestException if validation fails
   * @throws NotFoundException if post not found
   */
  async sharePost(
    postId: string,
    userId: string,
    recipientIds: string[],
  ): Promise<Share> {
    // Validation
    if (!postId || !userId || !recipientIds || recipientIds.length === 0) {
      throw new BadRequestException('Post ID, User ID, and at least one recipient are required');
    }

    if (recipientIds.length > 100) {
      throw new BadRequestException('Cannot share with more than 100 recipients at once');
    }

    // Check post exists
    const post = await this.databaseService.getPost(postId);
    if (!post) {
      throw new NotFoundException(`Post ${postId} not found`);
    }

    // Only published or archived posts can be shared
    if (post.state !== 'PUBLISHED' && post.state !== 'ARCHIVED') {
      throw new BadRequestException(
        `Cannot share post in ${post.state} state. Only published or archived posts can be shared.`,
      );
    }

    // Validate recipients are not empty strings
    const validRecipients = recipientIds.filter((id) => id && id.trim().length > 0);
    if (validRecipients.length === 0) {
      throw new BadRequestException('At least one valid recipient ID is required');
    }

    // Remove duplicates
    const uniqueRecipients = Array.from(new Set(validRecipients));

    // Prevent self-sharing
    if (uniqueRecipients.includes(userId)) {
      throw new ForbiddenException('Cannot share a post with yourself');
    }

    // Create share record
    const share: Share = {
      id: `share-${uuidv4()}`,
      postId,
      sharedBy: userId,
      sharedWith: uniqueRecipients,
      sharedAt: new Date().toISOString(),
      recipientCount: uniqueRecipients.length,
    };

    // Store share record
    this.shares.set(share.id, share);

    // Index by post for retrieval
    if (!this.sharesByPost.has(postId)) {
      this.sharesByPost.set(postId, []);
    }
    this.sharesByPost.get(postId)!.push(share.id);

    // Index by user for retrieval
    if (!this.sharesByUser.has(userId)) {
      this.sharesByUser.set(userId, []);
    }
    this.sharesByUser.get(userId)!.push(share.id);

    // Log to audit trail (immutable)
    await this.auditingService.logAction({
      actor: userId,
      action: 'share_post',
      resource: 'post',
      resourceId: postId,
    });

    this.logger.log(`Post ${postId} shared via ${method} by user ${userId}`);

    return share;
  }

  /**
   * Get share details by share ID
   *
   * @param shareId - The ID of the share
   * @returns Share object
   * @throws NotFoundException if share not found
   */
  async getShare(shareId: string): Promise<Share> {
    const share = this.shares.get(shareId);
    if (!share) {
      throw new NotFoundException(`Share ${shareId} not found`);
    }
    return share;
  }

  /**
   * Get all shares for a specific post
   *
   * @param postId - The ID of the post
   * @returns Array of shares for the post
   */
  async getSharesForPost(postId: string): Promise<Share[]> {
    const shareIds = this.sharesByPost.get(postId) || [];
    return shareIds
      .map((id) => this.shares.get(id))
      .filter((share): share is Share => share !== undefined);
  }

  /**
   * Get share count for a post
   *
   * @param postId - The ID of the post
   * @returns Total number of times post was shared
   */
  async getShareCount(postId: string): Promise<number> {
    return (this.sharesByPost.get(postId) || []).length;
  }

  /**
   * Get total unique recipients for a post (aggregated across all shares)
   *
   * @param postId - The ID of the post
   * @returns Count of unique users who received the post via sharing
   */
  async getShareReach(postId: string): Promise<number> {
    const shares = await this.getSharesForPost(postId);
    const uniqueRecipients = new Set<string>();

    for (const share of shares) {
      share.sharedWith.forEach((recipientId) => {
        uniqueRecipients.add(recipientId);
      });
    }

    return uniqueRecipients.size;
  }

  /**
   * Get all shares by a specific user
   *
   * @param userId - The ID of the user
   * @returns Array of shares created by the user
   */
  async getSharesByUser(userId: string): Promise<Share[]> {
    const shareIds = this.sharesByUser.get(userId) || [];
    return shareIds
      .map((id) => this.shares.get(id))
      .filter((share): share is Share => share !== undefined);
  }

  /**
   * Get share activity for audit dashboard
   * Returns recent shares for compliance reporting
   *
   * @param limit - Maximum number of records to return (default 100)
   * @returns Array of recent shares
   */
  async getRecentShares(limit: number = 100): Promise<Share[]> {
    return Array.from(this.shares.values())
      .sort((a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime())
      .slice(0, Math.min(limit, 100));
  }

  /**
   * Get share statistics for a post
   * Used for engagement dashboard analytics
   *
   * @param postId - The ID of the post
   * @returns Statistics object with share metrics
   */
  async getShareStats(postId: string): Promise<{
    totalShares: number;
    uniqueRecipients: number;
    sharingUsers: number;
    lastSharedAt?: string;
  }> {
    const shares = await this.getSharesForPost(postId);

    const uniqueRecipients = new Set<string>();
    const sharingUsers = new Set<string>();

    for (const share of shares) {
      sharingUsers.add(share.sharedBy);
      share.sharedWith.forEach((recipientId) => {
        uniqueRecipients.add(recipientId);
      });
    }

    const lastShare = shares.length > 0
      ? shares.reduce((latest, current) =>
          new Date(current.sharedAt) > new Date(latest.sharedAt) ? current : latest,
        )
      : undefined;

    return {
      totalShares: shares.length,
      uniqueRecipients: uniqueRecipients.size,
      sharingUsers: sharingUsers.size,
      lastSharedAt: lastShare?.sharedAt,
    };
  }
}
