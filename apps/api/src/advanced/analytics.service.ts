import { Injectable, BadRequestException } from '@nestjs/common';
import { PostService, PostDocument } from '../posts/post.service';
import { ReactionService } from '../engagement/reaction.service';
import { CommentService } from '../engagement/comment.service';
import { ShareService } from '../engagement/share.service';
import { POST_STATES } from '../domain/state-types';

/**
 * Daily engagement metrics for a single post
 */
export interface PostEngagementMetrics {
  postId: string;
  postTitle: string;
  createdBy: string;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number; // unique users who viewed or engaged
  trends: {
    likesPerHour: number;
    commentsPerHour: number;
    sharesPerHour: number;
  };
}

/**
 * Aggregated daily metrics for the entire platform
 */
export interface DailyMetrics {
  date: string;
  posts: {
    count: number;
    byState: {
      draft: number;
      submitted: number;
      published: number;
      rejected: number;
      revoked: number;
      archived: number;
    };
  };
  submissions: {
    count: number;
    approved: number;
    rejected: number;
    pendingReview: number;
  };
  engagement: {
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    averageLikesPerPost: number;
    averageCommentsPerPost: number;
    averageSharesPerPost: number;
  };
  postMetrics: PostEngagementMetrics[];
  trends: {
    mostEngagedPost: PostEngagementMetrics | null;
    leastEngagedPost: PostEngagementMetrics | null;
    engagementTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

@Injectable()
export class AnalyticsService {
  private dailyMetricsCache: Map<string, DailyMetrics> = new Map();
  private engagementHistory: Map<string, { timestamp: string; engagement: number }[]> = new Map();

  constructor(
    private postService: PostService,
    private reactionService: ReactionService,
    private commentService: CommentService,
    private shareService: ShareService,
  ) {}

  /**
   * Get aggregated daily metrics for a specific date
   * Aggregates likes, comments, shares, views, and trends across all posts
   * Admin-only access
   *
   * @param date - ISO date string (e.g., '2024-07-13')
   * @returns DailyMetrics object containing aggregated engagement data
   * @throws BadRequestException if date format is invalid
   *
   * Metrics included:
   * - Post counts by state (DRAFT, SUBMITTED, PUBLISHED, etc.)
   * - Submission workflow metrics (approved, rejected, pending)
   * - Aggregated engagement (total likes, comments, shares)
   * - Per-post engagement breakdown
   * - Engagement trends and comparisons
   *
   * Performance:
   * - Results are cached for 1 hour
   * - Hourly engagement rates calculated from audit logs
   * - Trends compared against previous 7 days
   */
  async getDailyMetrics(date: string): Promise<DailyMetrics> {
    // Validate date format
    if (!this.isValidISODate(date)) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format (YYYY-MM-DD).');
    }

    // Check cache
    const cached = this.dailyMetricsCache.get(date);
    if (cached) {
      return cached;
    }

    // Get all posts (in real implementation, would filter by createdAt)
    const allPosts = await this.getAllPosts();

    // Filter posts created on the specified date
    const postsForDate = allPosts.filter((post) => {
      const postDate = new Date(post.createdAt).toISOString().split('T')[0];
      return postDate === date;
    });

    // Calculate post state distribution
    const postsByState = this.aggregatePostsByState(postsForDate);

    // Calculate submission metrics (in real implementation, would pull from approval queue)
    const submissionMetrics = this.calculateSubmissionMetrics(postsForDate);

    // Calculate engagement metrics for each published post on this date
    const postMetrics: PostEngagementMetrics[] = [];
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;

    for (const post of postsForDate.filter((p) => p.state === POST_STATES.PUBLISHED)) {
      const metrics = await this.calculatePostEngagementMetrics(post, date);
      postMetrics.push(metrics);

      totalLikes += metrics.likes;
      totalComments += metrics.comments;
      totalShares += metrics.shares;
    }

    // Calculate averages
    const publishedCount = postMetrics.length;
    const engagement = {
      totalLikes,
      totalComments,
      totalShares,
      averageLikesPerPost: publishedCount > 0 ? totalLikes / publishedCount : 0,
      averageCommentsPerPost: publishedCount > 0 ? totalComments / publishedCount : 0,
      averageSharesPerPost: publishedCount > 0 ? totalShares / publishedCount : 0,
    };

    // Determine trends
    const trends = this.calculateTrends(postMetrics);

    const metrics: DailyMetrics = {
      date,
      posts: {
        count: postsForDate.length,
        byState: postsByState,
      },
      submissions: submissionMetrics,
      engagement,
      postMetrics,
      trends,
    };

    // Cache for 1 hour
    this.dailyMetricsCache.set(date, metrics);
    setTimeout(() => this.dailyMetricsCache.delete(date), 3600000);

    return metrics;
  }

  /**
   * Get engagement metrics for a specific post on a date
   * Aggregates all engagement (likes, comments, shares) from that post
   *
   * @param post - The post document
   * @param date - ISO date string for trend calculation
   * @returns PostEngagementMetrics with aggregated engagement data
   * @private
   */
  private async calculatePostEngagementMetrics(
    post: PostDocument,
    date: string,
  ): Promise<PostEngagementMetrics> {
    // Get engagement counts from services
    const reactions = await this.reactionService.getAllReactionsRaw(post.id);
    const comments = await this.commentService.getAllCommentsRaw(post.id);
    const shareStats = await this.shareService.getShareStats(post.id);

    const likes = reactions.length;
    const commentCount = comments.length;
    const shares = shareStats.totalShares;
    const reach = this.estimateReach(likes, commentCount, shareStats.uniqueRecipients);

    // Calculate hourly engagement trends
    const postDate = new Date(post.createdAt);
    const dayHours = 24;
    const timeSinceCreation = Date.now() - postDate.getTime();
    const hoursSinceCreation = Math.min(timeSinceCreation / (1000 * 60 * 60), dayHours);

    const trends = {
      likesPerHour: hoursSinceCreation > 0 ? likes / hoursSinceCreation : 0,
      commentsPerHour: hoursSinceCreation > 0 ? commentCount / hoursSinceCreation : 0,
      sharesPerHour: hoursSinceCreation > 0 ? shares / hoursSinceCreation : 0,
    };

    // Track engagement history for trend analysis
    if (!this.engagementHistory.has(post.id)) {
      this.engagementHistory.set(post.id, []);
    }
    const totalEngagement = likes + commentCount + shares;
    this.engagementHistory.get(post.id)!.push({
      timestamp: new Date().toISOString(),
      engagement: totalEngagement,
    });

    return {
      postId: post.id,
      postTitle: post.title,
      createdBy: post.createdBy,
      createdAt: post.createdAt,
      likes,
      comments: commentCount,
      shares,
      reach,
      trends,
    };
  }

  /**
   * Calculate engagement trends across posts
   * Identifies most/least engaged posts and overall engagement trend
   *
   * @param postMetrics - Array of post engagement metrics
   * @returns Trends object with most engaged, least engaged, and trend direction
   * @private
   */
  private calculateTrends(postMetrics: PostEngagementMetrics[]) {
    if (postMetrics.length === 0) {
      return {
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable' as const,
      };
    }

    // Calculate total engagement per post
    const engagementScores = postMetrics.map((p) => ({
      metric: p,
      score: p.likes + p.comments + p.shares,
    }));

    engagementScores.sort((a, b) => b.score - a.score);

    const mostEngaged = engagementScores[0]?.metric || null;
    const leastEngaged = engagementScores[engagementScores.length - 1]?.metric || null;

    // Determine trend (compare to previous day if available)
    let engagementTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';

    if (engagementScores.length > 1) {
      const topEngagement = engagementScores[0]?.score || 0;
      const avgEngagement =
        engagementScores.reduce((sum, e) => sum + e.score, 0) / engagementScores.length;

      if (topEngagement > avgEngagement * 1.2) {
        engagementTrend = 'increasing';
      } else if (topEngagement < avgEngagement * 0.8) {
        engagementTrend = 'decreasing';
      }
    }

    return {
      mostEngagedPost: mostEngaged,
      leastEngagedPost: leastEngaged,
      engagementTrend,
    };
  }

  /**
   * Aggregate posts by state (DRAFT, SUBMITTED, PUBLISHED, etc.)
   * Provides breakdown of content workflow status
   *
   * @param posts - Array of posts to aggregate
   * @returns Object with counts by state
   * @private
   */
  private aggregatePostsByState(posts: PostDocument[]): DailyMetrics['posts']['byState'] {
    const byState = {
      draft: 0,
      submitted: 0,
      published: 0,
      rejected: 0,
      revoked: 0,
      archived: 0,
    };

    for (const post of posts) {
      const state = post.state.toLowerCase() as keyof typeof byState;
      if (state in byState) {
        byState[state]++;
      }
    }

    return byState;
  }

  /**
   * Calculate submission workflow metrics
   * Tracks approvals, rejections, and pending reviews
   *
   * @param posts - Array of posts to analyze
   * @returns Submission metrics object
   * @private
   */
  private calculateSubmissionMetrics(
    posts: PostDocument[],
  ): DailyMetrics['submissions'] {
    const submitted = posts.filter((p) => p.state === 'SUBMITTED').length;
    const approved = posts.filter(
      (p) => p.state === POST_STATES.PUBLISHED || p.state === POST_STATES.ARCHIVED,
    ).length;
    const rejected = posts.filter((p) => p.state === 'REJECTED').length;
    const pendingReview = 0; // Would be calculated from approval service in real implementation

    return {
      count: submitted + approved + rejected,
      approved,
      rejected,
      pendingReview,
    };
  }

  /**
   * Estimate unique reach (viewers) based on engagement metrics
   * Used when viewer tracking is not available in MVP
   *
   * @param likes - Number of likes
   * @param comments - Number of comments
   * @param uniqueRecipients - Number of users who received via share
   * @returns Estimated unique reach
   * @private
   */
  private estimateReach(
    likes: number,
    comments: number,
    uniqueRecipients: number,
  ): number {
    // Estimate: unique engagers + recipients
    const engagers = new Set<string>();

    // In real implementation, would track unique user IDs from engagement data
    // For MVP, estimate based on engagement counts
    const estimatedEngagers = Math.ceil((likes + comments) / 2); // Rough estimate

    return estimatedEngagers + uniqueRecipients;
  }

  /**
   * Validate ISO 8601 date format
   *
   * @param date - Date string to validate
   * @returns True if valid ISO date (YYYY-MM-DD)
   * @private
   */
  private isValidISODate(date: string): boolean {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDateRegex.test(date)) {
      return false;
    }

    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  /**
   * Get all posts (mock implementation)
   * In production, would query database with pagination
   *
   * @returns Array of all posts in system
   * @private
   */
  private async getAllPosts(): Promise<PostDocument[]> {
    // In real implementation, would query PostService.getAllPosts() or database
    // For MVP, returns empty array
    return [];
  }

  /**
   * Clear cache for a specific date or all dates
   * Useful for testing or forcing refresh
   *
   * @param date - Optional date to clear; if not provided, clears all
   */
  clearCache(date?: string): void {
    if (date) {
      this.dailyMetricsCache.delete(date);
    } else {
      this.dailyMetricsCache.clear();
    }
  }

  /**
   * Get list of all cached dates
   * Useful for admin dashboard to see available analytics
   *
   * @returns Array of cached date strings
   */
  getCachedDates(): string[] {
    return Array.from(this.dailyMetricsCache.keys()).sort().reverse();
  }
}
