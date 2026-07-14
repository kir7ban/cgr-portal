import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService, Post } from '../database/database.service';
import { POST_STATES } from '../domain/state-types';

/**
 * Audience scope types for post visibility
 */
export type AudienceScope = 'org-wide' | 'dept-only' | string; // custom: prefix for custom audiences

/**
 * Post document as returned from feed
 */
export interface PublishedPost extends Post {
  proposedAudience?: string;
  approvedAudience?: string;
  approvedBy?: string;
  approvedAt?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Feed filter options
 */
export interface FeedFilterOptions {
  audiences?: string[]; // Audiences the user belongs to
  excludeArchived?: boolean; // Exclude archived posts (default: true)
  includeDrafts?: boolean; // Include draft posts (only for creator, default: false)
}

/**
 * Paginated feed response
 */
export interface PaginatedFeedResponse {
  items: PublishedPost[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * FeedService: Retrieve published posts with pagination, audience filtering, and chronological sorting
 *
 * Responsibilities:
 * - Filter posts by published state
 * - Apply audience-based access control
 * - Implement pagination (offset-based)
 * - Sort chronologically (newest first)
 * - Handle archived posts
 *
 * Key Feature: Audience Filtering
 * - Posts visible to "org-wide" audiences are always included
 * - Posts visible to "dept-only" audiences are included if user belongs to that department
 * - Posts visible to custom audiences are included if user belongs to that audience
 */
@Injectable()
export class FeedService {
  private publishedPosts: Map<string, PublishedPost> = new Map();

  constructor(private databaseService: DatabaseService) {}

  /**
   * Get published feed with pagination, audience filtering, and chronological sorting
   *
   * @param userId - User requesting the feed
   * @param pagination - Pagination parameters (page, pageSize)
   * @param filters - Filter options (audiences, excludeArchived, includeDrafts)
   * @returns Paginated feed response with posts visible to the user
   *
   * @throws BadRequestException if pagination params are invalid
   *
   * Sorting: Chronological (newest first) by createdAt
   * Audience Filtering:
   *   - org-wide → visible to all employees
   *   - dept-only → visible to employees in that department
   *   - custom:<groupId> → visible to employees in that custom group
   */
  async getPublishedFeed(
    userId: string,
    pagination: PaginationParams,
    filters?: FeedFilterOptions,
  ): Promise<PaginatedFeedResponse> {
    this.validatePaginationParams(pagination);

    const excludeArchived = filters?.excludeArchived !== false;
    const userAudiences = filters?.audiences || [];
    const includeDrafts = filters?.includeDrafts || false;

    // Get all posts and filter
    const allPosts = Array.from(this.publishedPosts.values());

    // Step 1: Filter by state (PUBLISHED, optionally include DRAFT)
    let filteredPosts = allPosts.filter((post) => {
      if (post.state === POST_STATES.PUBLISHED) return true;
      if (includeDrafts && post.state === 'DRAFT' && post.createdBy === userId) return true;
      return false;
    });

    // Step 2: Exclude archived posts if requested
    if (excludeArchived) {
      filteredPosts = filteredPosts.filter((post) => post.state !== 'ARCHIVED');
    }

    // Step 3: Filter by audience access
    filteredPosts = filteredPosts.filter((post) =>
      this.userCanViewPost(post, userAudiences),
    );

    // Step 4: Sort chronologically (newest first)
    filteredPosts.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order
    });

    // Step 5: Implement pagination
    const totalCount = filteredPosts.length;
    const pageNumber = pagination.page;
    const pageSize = pagination.pageSize;
    const totalPages = Math.ceil(totalCount / pageSize);

    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = filteredPosts.slice(startIndex, endIndex);

    return {
      items: pageItems,
      totalCount,
      pageNumber,
      pageSize,
      totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPreviousPage: pageNumber > 1,
    };
  }

  /**
   * Add a published post to the feed
   * (Used after admin approval)
   *
   * @param post - Post to add to feed (must be in PUBLISHED state)
   * @returns The added post
   * @throws BadRequestException if post is not in PUBLISHED state
   */
  async addPublishedPost(post: PublishedPost): Promise<PublishedPost> {
    if (post.state !== POST_STATES.PUBLISHED) {
      throw new BadRequestException('Only PUBLISHED posts can be added to feed');
    }

    this.publishedPosts.set(post.id, post);
    return post;
  }

  /**
   * Remove a post from the feed
   * (Used when admin revokes or archives a post)
   *
   * @param postId - Post ID to remove
   * @returns The removed post, or undefined if not found
   */
  async removeFromFeed(postId: string): Promise<PublishedPost | undefined> {
    const post = this.publishedPosts.get(postId);
    this.publishedPosts.delete(postId);
    return post;
  }

  /**
   * Get a single published post (if user can view it)
   *
   * @param postId - Post ID
   * @param userId - User requesting the post
   * @param userAudiences - Audiences the user belongs to
   * @returns The post if found and user can view it, undefined otherwise
   */
  async getPublishedPost(
    postId: string,
    userId: string,
    userAudiences?: string[],
  ): Promise<PublishedPost | undefined> {
    const post = this.publishedPosts.get(postId);

    if (!post || post.state !== POST_STATES.PUBLISHED) {
      return undefined;
    }

    const audiences = userAudiences || [];
    if (this.userCanViewPost(post, audiences)) {
      return post;
    }

    return undefined;
  }

  /**
   * Update a post's audience scope after admin re-approval
   * (Used in edit-and-resubmit workflow)
   *
   * @param postId - Post ID
   * @param newAudience - New approved audience
   * @param approvedBy - Admin who approved
   * @returns Updated post
   * @throws BadRequestException if post not found
   */
  async updatePostAudience(
    postId: string,
    newAudience: string,
    approvedBy: string,
  ): Promise<PublishedPost> {
    const post = this.publishedPosts.get(postId);

    if (!post) {
      throw new BadRequestException('Post not found in feed');
    }

    post.approvedAudience = newAudience;
    post.approvedBy = approvedBy;
    post.approvedAt = new Date().toISOString();

    this.publishedPosts.set(postId, post);
    return post;
  }

  /**
   * Archive a post (soft-delete: still searchable, removed from feed)
   *
   * @param postId - Post ID
   * @returns Updated post with ARCHIVED state
   * @throws BadRequestException if post not found
   */
  async archivePost(postId: string): Promise<PublishedPost> {
    const post = this.publishedPosts.get(postId);

    if (!post) {
      throw new BadRequestException('Post not found');
    }

    post.state = 'ARCHIVED';
    this.publishedPosts.set(postId, post);
    return post;
  }

  /**
   * Get feed statistics
   * (Used for debugging/analytics)
   *
   * @returns Object with feed stats
   */
  async getFeedStats(): Promise<{
    totalPublished: number;
    totalArchived: number;
    totalDrafts: number;
  }> {
    const posts = Array.from(this.publishedPosts.values());
    return {
      totalPublished: posts.filter((p) => p.state === POST_STATES.PUBLISHED).length,
      totalArchived: posts.filter((p) => p.state === 'ARCHIVED').length,
      totalDrafts: posts.filter((p) => p.state === 'DRAFT').length,
    };
  }

  /**
   * Determine if a user can view a post based on audience scope
   *
   * Visibility Rules:
   * - org-wide posts: visible to all users
   * - dept-only posts: visible only to users in that department
   * - custom:<groupId> posts: visible only to users in that custom group
   *
   * @param post - Post to check access for
   * @param userAudiences - Audiences the user belongs to
   * @returns true if user can view the post
   */
  private userCanViewPost(post: PublishedPost, userAudiences: string[]): boolean {
    const audience = post.approvedAudience || post.proposedAudience;

    // If no audience specified, default to org-wide (visible to all)
    if (!audience) {
      return true;
    }

    // org-wide audience is visible to everyone
    if (audience === 'org-wide') {
      return true;
    }

    // For other audiences, user must belong to at least one
    return userAudiences.includes(audience);
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
}
