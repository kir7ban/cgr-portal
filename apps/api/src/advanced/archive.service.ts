import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService, Post } from '../database/database.service';
import { AuditingService } from '../database/auditing.service';
import { POST_STATES } from '../domain/state-types';

/**
 * Batch job result from archiving operation
 */
export interface ArchiveBatchResult {
  batchId: string;
  startedAt: string;
  completedAt: string;
  archivedCount: number;
  failedCount: number;
  postIds: string[];
  errors: Array<{ postId: string; error: string }>;
  duration: number; // milliseconds
}

/**
 * Archive statistics and metrics
 */
export interface ArchiveStats {
  totalArchivedPosts: number;
  totalArchivedPostsSize: number; // bytes
  oldestArchivedPost?: {
    id: string;
    archivedAt: string;
    originalPublishDate: string;
  };
  newestArchivedPost?: {
    id: string;
    archivedAt: string;
    originalPublishDate: string;
  };
  archivesByMonth: {
    month: string;
    count: number;
  }[];
}

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger('ArchiveService');
  private archivedPosts: Map<string, Post> = new Map();
  private archiveTimestamps: Map<string, string> = new Map();
  private batchHistory: Map<string, ArchiveBatchResult> = new Map();

  constructor(
    private databaseService: DatabaseService,
    private auditingService: AuditingService,
  ) {}

  /**
   * Archive posts older than specified days (default 365 = 1 year)
   * This is the main batch job that runs daily (via schedule)
   *
   * @param olderThanDays - Posts older than this many days will be archived (default: 365)
   * @param maxBatchSize - Maximum posts to process in one batch (default: 1000)
   * @returns Batch result with count, IDs, and any errors
   */
  async archiveOldPosts(
    olderThanDays: number = 365,
    maxBatchSize: number = 1000,
  ): Promise<ArchiveBatchResult> {
    const batchId = `batch-archive-${Date.now()}`;
    const startedAt = new Date();

    this.logger.debug(
      `[${batchId}] Starting archive batch job for posts older than ${olderThanDays} days`,
    );

    const cutoffDate = new Date(startedAt.getTime() - olderThanDays * 24 * 60 * 60 * 1000);
    const postIds: string[] = [];
    const errors: Array<{ postId: string; error: string }> = [];
    let successCount = 0;

    try {
      // Get all posts from database
      const allPosts = await this.getAllPosts();

      // Filter posts that match archive criteria:
      // 1. Created more than olderThanDays ago
      // 2. In PUBLISHED state (we only archive published posts)
      // 3. Not already archived
      const postsToArchive = allPosts
        .filter((post) => {
          const createdDate = new Date(post.createdAt);
          return (
            createdDate < cutoffDate &&
            post.state === POST_STATES.PUBLISHED &&
            !this.archivedPosts.has(post.id)
          );
        })
        .slice(0, maxBatchSize);

      this.logger.log(
        `[${batchId}] Found ${postsToArchive.length} posts eligible for archiving`,
      );

      // Process each post
      for (const post of postsToArchive) {
        try {
          // Update post state to ARCHIVED
          const archivedPost = await this.databaseService.updatePost(post.id, {
            state: POST_STATES.ARCHIVED,
          });

          // Store in archive tracking
          this.archivedPosts.set(post.id, archivedPost);
          this.archiveTimestamps.set(post.id, new Date().toISOString());
          postIds.push(post.id);

          // Log audit entry
          await this.auditingService.logAction({
            actor: 'system',
            action: 'archive_post',
            resource: 'post',
            resourceId: post.id,
          });

          successCount++;
          this.logger.debug(`[${batchId}] Archived post ${post.id}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({ postId: post.id, error: errorMsg });
          this.logger.warn(`[${batchId}] Failed to archive post ${post.id}: ${errorMsg}`);
        }
      }

      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      const result: ArchiveBatchResult = {
        batchId,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        archivedCount: successCount,
        failedCount: errors.length,
        postIds,
        errors,
        duration,
      };

      // Store batch result in history
      this.batchHistory.set(batchId, result);

      this.logger.log(
        `[${batchId}] Archive batch completed: ${successCount} succeeded, ${errors.length} failed in ${duration}ms`,
      );

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${batchId}] Archive batch job failed: ${errorMsg}`, error);

      const completedAt = new Date();
      const result: ArchiveBatchResult = {
        batchId,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        archivedCount: successCount,
        failedCount: errors.length,
        postIds,
        errors,
        duration: completedAt.getTime() - startedAt.getTime(),
      };

      this.batchHistory.set(batchId, result);
      throw error;
    }
  }

  /**
   * Get batch result by batch ID
   * @param batchId - The batch ID
   * @returns Batch result or undefined
   */
  async getBatchResult(batchId: string): Promise<ArchiveBatchResult | undefined> {
    return this.batchHistory.get(batchId);
  }

  /**
   * Get recent batch jobs (for monitoring/admin dashboard)
   * @param limit - Maximum number of batches to return (default 100)
   * @returns Array of recent batch results, newest first
   */
  async getRecentBatches(limit: number = 100): Promise<ArchiveBatchResult[]> {
    const batches = Array.from(this.batchHistory.values());
    return batches
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      )
      .slice(0, limit);
  }

  /**
   * Get archived post by ID
   * @param postId - The post ID
   * @returns Archived post if found
   */
  async getArchivedPost(postId: string): Promise<Post | undefined> {
    return this.archivedPosts.get(postId);
  }

  /**
   * Get all archived posts
   * @returns Array of all archived posts
   */
  async getAllArchivedPosts(): Promise<Post[]> {
    return Array.from(this.archivedPosts.values());
  }

  /**
   * Get count of archived posts
   * @returns Number of archived posts
   */
  async getArchivedPostCount(): Promise<number> {
    return this.archivedPosts.size;
  }

  /**
   * Get archive statistics and metrics
   * @returns Archive statistics
   */
  async getArchiveStats(): Promise<ArchiveStats> {
    const archivedPostsArray = Array.from(this.archivedPosts.values());

    if (archivedPostsArray.length === 0) {
      return {
        totalArchivedPosts: 0,
        totalArchivedPostsSize: 0,
        archivesByMonth: [],
      };
    }

    // Calculate total size (rough estimate: title + content lengths)
    const totalSize = archivedPostsArray.reduce((sum, post) => {
      return sum + post.title.length + post.content.length;
    }, 0);

    // Find oldest and newest
    const sorted = archivedPostsArray.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];

    // Group by month
    const archivesByMonth: { [key: string]: number } = {};
    archivedPostsArray.forEach((post) => {
      const date = new Date(post.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        '0',
      )}`;
      archivesByMonth[monthKey] = (archivesByMonth[monthKey] || 0) + 1;
    });

    return {
      totalArchivedPosts: archivedPostsArray.length,
      totalArchivedPostsSize: totalSize,
      oldestArchivedPost: {
        id: oldest.id,
        archivedAt: this.archiveTimestamps.get(oldest.id) || 'unknown',
        originalPublishDate: oldest.createdAt,
      },
      newestArchivedPost: {
        id: newest.id,
        archivedAt: this.archiveTimestamps.get(newest.id) || 'unknown',
        originalPublishDate: newest.createdAt,
      },
      archivesByMonth: Object.entries(archivesByMonth)
        .map(([month, count]) => ({
          month,
          count,
        }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  /**
   * Restore an archived post back to PUBLISHED state
   * @param postId - The post ID to restore
   * @param userId - User requesting the restore (for audit)
   * @returns Restored post
   */
  async restoreArchivedPost(postId: string, userId: string): Promise<Post> {
    const archivedPost = this.archivedPosts.get(postId);
    if (!archivedPost) {
      throw new Error(`Archived post ${postId} not found`);
    }

    // Update state back to PUBLISHED
    const restoredPost = await this.databaseService.updatePost(postId, {
      state: POST_STATES.PUBLISHED,
    });

    // Remove from archive tracking
    this.archivedPosts.delete(postId);
    this.archiveTimestamps.delete(postId);

    // Log audit entry
    await this.auditingService.logAction({
      actor: userId,
      action: 'restore_post',
      resource: 'post',
      resourceId: postId,
    });

    return restoredPost;
  }

  /**
   * Check if post is archived
   * @param postId - The post ID
   * @returns true if post is archived
   */
  async isArchived(postId: string): Promise<boolean> {
    return this.archivedPosts.has(postId);
  }

  /**
   * Get all posts from database
   * Internal helper method
   * @private
   */
  private async getAllPosts(): Promise<Post[]> {
    // This would query CosmosDB in production
    // For MVP, we scan the mock collections
    const collections = await this.databaseService.getCollections();
    if (!collections.includes('posts')) {
      return [];
    }

    // In a real implementation, this would query CosmosDB
    // For now, return empty array as the in-memory store doesn't expose this
    return [];
  }
}
