import { BadRequestException } from '@nestjs/common';
import { AnalyticsService, DailyMetrics, PostEngagementMetrics } from './analytics.service';
import { PostService, PostDocument } from '../posts/post.service';
import { ReactionService } from '../engagement/reaction.service';
import { CommentService } from '../engagement/comment.service';
import { ShareService } from '../engagement/share.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let postService: PostService;
  let reactionService: ReactionService;
  let commentService: CommentService;
  let shareService: ShareService;

  beforeEach(() => {
    postService = {
      getAllPosts: jest.fn(),
      createDraft: jest.fn(),
    } as any;

    reactionService = {
      getAllReactionsRaw: jest.fn(),
    } as any;

    commentService = {
      getAllCommentsRaw: jest.fn(),
    } as any;

    shareService = {
      getShareStats: jest.fn(),
    } as any;

    service = new AnalyticsService(
      postService,
      reactionService,
      commentService,
      shareService,
    );
  });

  describe('getDailyMetrics()', () => {
    it('should return daily metrics for a valid date', async () => {
      const date = '2024-07-13';

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);
      jest.spyOn(service as any, 'aggregatePostsByState').mockReturnValue({
        draft: 0,
        submitted: 0,
        published: 0,
        rejected: 0,
        revoked: 0,
        archived: 0,
      });
      jest.spyOn(service as any, 'calculateSubmissionMetrics').mockReturnValue({
        count: 0,
        approved: 0,
        rejected: 0,
        pendingReview: 0,
      });
      jest.spyOn(service as any, 'calculateTrends').mockReturnValue({
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable',
      });

      const result = await service.getDailyMetrics(date);

      expect(result).toBeDefined();
      expect(result.date).toBe(date);
      expect(result.posts).toBeDefined();
      expect(result.submissions).toBeDefined();
      expect(result.engagement).toBeDefined();
      expect(result.postMetrics).toEqual([]);
      expect(result.trends).toBeDefined();
    });

    it('should throw BadRequestException for invalid date format', async () => {
      const invalidDates = ['2024/07/13', '13-07-2024', 'invalid', ''];

      for (const date of invalidDates) {
        await expect(service.getDailyMetrics(date))
          .rejects
          .toThrow(BadRequestException);
      }
    });

    it('should cache results for 1 hour', async () => {
      const date = '2024-07-13';

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);
      jest.spyOn(service as any, 'aggregatePostsByState').mockReturnValue({
        draft: 0,
        submitted: 0,
        published: 0,
        rejected: 0,
        revoked: 0,
        archived: 0,
      });
      jest.spyOn(service as any, 'calculateSubmissionMetrics').mockReturnValue({
        count: 0,
        approved: 0,
        rejected: 0,
        pendingReview: 0,
      });
      jest.spyOn(service as any, 'calculateTrends').mockReturnValue({
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable',
      });

      const result1 = await service.getDailyMetrics(date);
      const result2 = await service.getDailyMetrics(date);

      expect(result1).toBe(result2); // Same object reference (cached)
    });

    it('should aggregate posts by state correctly', async () => {
      const date = '2024-07-13';
      const mockPosts = [
        {
          id: '1',
          title: 'Draft Post',
          content: 'Draft content',
          state: 'DRAFT',
          createdBy: 'user1',
          createdAt: '2024-07-13T10:00:00Z',
        },
        {
          id: '2',
          title: 'Published Post',
          content: 'Published content',
          state: 'PUBLISHED',
          createdBy: 'user1',
          createdAt: '2024-07-13T11:00:00Z',
        },
        {
          id: '3',
          title: 'Another Published',
          content: 'Content',
          state: 'PUBLISHED',
          createdBy: 'user2',
          createdAt: '2024-07-13T12:00:00Z',
        },
      ] as PostDocument[];

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue(mockPosts);
      jest.spyOn(service as any, 'calculateSubmissionMetrics').mockReturnValue({
        count: 3,
        approved: 2,
        rejected: 0,
        pendingReview: 0,
      });
      jest.spyOn(service as any, 'calculateTrends').mockReturnValue({
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable',
      });

      jest.spyOn(service as any, 'calculatePostEngagementMetrics')
        .mockResolvedValue({
          postId: '',
          postTitle: '',
          createdBy: '',
          createdAt: '',
          likes: 0,
          comments: 0,
          shares: 0,
          reach: 0,
          trends: { likesPerHour: 0, commentsPerHour: 0, sharesPerHour: 0 },
        });

      const result = await service.getDailyMetrics(date);

      expect(result.posts.count).toBe(3);
      expect(result.posts.byState.draft).toBe(1);
      expect(result.posts.byState.published).toBe(2);
    });

    it('should calculate engagement metrics for published posts only', async () => {
      const date = '2024-07-13';
      const mockPosts = [
        {
          id: '1',
          title: 'Draft',
          content: 'Content',
          state: 'DRAFT',
          createdBy: 'user1',
          createdAt: '2024-07-13T10:00:00Z',
        },
        {
          id: '2',
          title: 'Published',
          content: 'Content',
          state: 'PUBLISHED',
          createdBy: 'user1',
          createdAt: '2024-07-13T11:00:00Z',
        },
      ] as PostDocument[];

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue(mockPosts);
      jest.spyOn(service as any, 'calculateSubmissionMetrics').mockReturnValue({
        count: 1,
        approved: 1,
        rejected: 0,
        pendingReview: 0,
      });
      jest.spyOn(service as any, 'calculateTrends').mockReturnValue({
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable',
      });

      jest.spyOn(service as any, 'calculatePostEngagementMetrics')
        .mockResolvedValue({
          postId: '2',
          postTitle: 'Published',
          createdBy: 'user1',
          createdAt: '2024-07-13T11:00:00Z',
          likes: 10,
          comments: 5,
          shares: 2,
          reach: 20,
          trends: { likesPerHour: 1, commentsPerHour: 0.5, sharesPerHour: 0.2 },
        });

      const result = await service.getDailyMetrics(date);

      expect(result.postMetrics).toHaveLength(1);
      expect(result.postMetrics[0].postId).toBe('2');
    });

    it('should calculate correct engagement averages', async () => {
      const date = '2024-07-13';
      const mockPosts = [
        {
          id: '1',
          title: 'Post 1',
          content: 'Content',
          state: 'PUBLISHED',
          createdBy: 'user1',
          createdAt: '2024-07-13T10:00:00Z',
        },
        {
          id: '2',
          title: 'Post 2',
          content: 'Content',
          state: 'PUBLISHED',
          createdBy: 'user1',
          createdAt: '2024-07-13T11:00:00Z',
        },
      ] as PostDocument[];

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue(mockPosts);
      jest.spyOn(service as any, 'calculateSubmissionMetrics').mockReturnValue({
        count: 2,
        approved: 2,
        rejected: 0,
        pendingReview: 0,
      });
      jest.spyOn(service as any, 'calculateTrends').mockReturnValue({
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable',
      });

      const calculatePostEngagementMetricsSpy = jest
        .spyOn(service as any, 'calculatePostEngagementMetrics');

      calculatePostEngagementMetricsSpy
        .mockResolvedValueOnce({
          postId: '1',
          postTitle: 'Post 1',
          createdBy: 'user1',
          createdAt: '2024-07-13T10:00:00Z',
          likes: 10,
          comments: 4,
          shares: 2,
          reach: 20,
          trends: { likesPerHour: 1, commentsPerHour: 0.4, sharesPerHour: 0.2 },
        });

      calculatePostEngagementMetricsSpy
        .mockResolvedValueOnce({
          postId: '2',
          postTitle: 'Post 2',
          createdBy: 'user1',
          createdAt: '2024-07-13T11:00:00Z',
          likes: 20,
          comments: 6,
          shares: 4,
          reach: 40,
          trends: { likesPerHour: 2, commentsPerHour: 0.6, sharesPerHour: 0.4 },
        });

      const result = await service.getDailyMetrics(date);

      expect(result.engagement.totalLikes).toBe(30);
      expect(result.engagement.totalComments).toBe(10);
      expect(result.engagement.totalShares).toBe(6);
      expect(result.engagement.averageLikesPerPost).toBe(15);
      expect(result.engagement.averageCommentsPerPost).toBe(5);
      expect(result.engagement.averageSharesPerPost).toBe(3);
    });

    it('should handle dates with no posts', async () => {
      const date = '2024-07-13';

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);
      jest.spyOn(service as any, 'calculateSubmissionMetrics').mockReturnValue({
        count: 0,
        approved: 0,
        rejected: 0,
        pendingReview: 0,
      });
      jest.spyOn(service as any, 'calculateTrends').mockReturnValue({
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable',
      });

      const result = await service.getDailyMetrics(date);

      expect(result.posts.count).toBe(0);
      expect(result.postMetrics).toHaveLength(0);
      expect(result.engagement.totalLikes).toBe(0);
      expect(result.engagement.averageLikesPerPost).toBe(0);
    });

    it('should filter posts by date correctly', async () => {
      const targetDate = '2024-07-13';
      const mockPosts = [
        {
          id: '1',
          title: 'Post on target date',
          content: 'Content',
          state: 'PUBLISHED',
          createdBy: 'user1',
          createdAt: '2024-07-13T10:00:00Z',
        },
        {
          id: '2',
          title: 'Post on different date',
          content: 'Content',
          state: 'PUBLISHED',
          createdBy: 'user1',
          createdAt: '2024-07-14T10:00:00Z',
        },
      ] as PostDocument[];

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue(mockPosts);
      jest.spyOn(service as any, 'calculateSubmissionMetrics').mockReturnValue({
        count: 1,
        approved: 1,
        rejected: 0,
        pendingReview: 0,
      });
      jest.spyOn(service as any, 'calculateTrends').mockReturnValue({
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable',
      });

      jest.spyOn(service as any, 'calculatePostEngagementMetrics')
        .mockResolvedValue({
          postId: '1',
          postTitle: 'Post on target date',
          createdBy: 'user1',
          createdAt: '2024-07-13T10:00:00Z',
          likes: 5,
          comments: 2,
          shares: 1,
          reach: 10,
          trends: { likesPerHour: 0.5, commentsPerHour: 0.2, sharesPerHour: 0.1 },
        });

      const result = await service.getDailyMetrics(targetDate);

      expect(result.posts.count).toBe(1);
      expect(result.postMetrics).toHaveLength(1);
      expect(result.postMetrics[0].postId).toBe('1');
    });
  });

  describe('clearCache()', () => {
    it('should clear cache for a specific date', async () => {
      const date = '2024-07-13';

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);
      jest.spyOn(service as any, 'aggregatePostsByState').mockReturnValue({
        draft: 0,
        submitted: 0,
        published: 0,
        rejected: 0,
        revoked: 0,
        archived: 0,
      });
      jest.spyOn(service as any, 'calculateSubmissionMetrics').mockReturnValue({
        count: 0,
        approved: 0,
        rejected: 0,
        pendingReview: 0,
      });
      jest.spyOn(service as any, 'calculateTrends').mockReturnValue({
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable',
      });

      // Cache the result
      await service.getDailyMetrics(date);
      expect(service.getCachedDates()).toContain(date);

      // Clear the cache
      service.clearCache(date);
      expect(service.getCachedDates()).not.toContain(date);
    });

    it('should clear all cache when no date provided', async () => {
      const date1 = '2024-07-13';
      const date2 = '2024-07-14';

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);
      jest.spyOn(service as any, 'aggregatePostsByState').mockReturnValue({
        draft: 0,
        submitted: 0,
        published: 0,
        rejected: 0,
        revoked: 0,
        archived: 0,
      });
      jest.spyOn(service as any, 'calculateSubmissionMetrics').mockReturnValue({
        count: 0,
        approved: 0,
        rejected: 0,
        pendingReview: 0,
      });
      jest.spyOn(service as any, 'calculateTrends').mockReturnValue({
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable',
      });

      // Cache results
      await service.getDailyMetrics(date1);
      await service.getDailyMetrics(date2);
      expect(service.getCachedDates()).toHaveLength(2);

      // Clear all cache
      service.clearCache();
      expect(service.getCachedDates()).toHaveLength(0);
    });
  });

  describe('getCachedDates()', () => {
    it('should return list of cached dates in reverse chronological order', async () => {
      const dates = ['2024-07-11', '2024-07-13', '2024-07-12'];

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);
      jest.spyOn(service as any, 'aggregatePostsByState').mockReturnValue({
        draft: 0,
        submitted: 0,
        published: 0,
        rejected: 0,
        revoked: 0,
        archived: 0,
      });
      jest.spyOn(service as any, 'calculateSubmissionMetrics').mockReturnValue({
        count: 0,
        approved: 0,
        rejected: 0,
        pendingReview: 0,
      });
      jest.spyOn(service as any, 'calculateTrends').mockReturnValue({
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable',
      });

      for (const date of dates) {
        await service.getDailyMetrics(date);
      }

      const cachedDates = service.getCachedDates();

      expect(cachedDates).toEqual(['2024-07-13', '2024-07-12', '2024-07-11']);
    });

    it('should return empty array when no dates cached', () => {
      const cachedDates = service.getCachedDates();
      expect(cachedDates).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('should handle leap year dates', async () => {
      const leapYearDate = '2024-02-29';

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);
      jest.spyOn(service as any, 'aggregatePostsByState').mockReturnValue({
        draft: 0,
        submitted: 0,
        published: 0,
        rejected: 0,
        revoked: 0,
        archived: 0,
      });
      jest.spyOn(service as any, 'calculateSubmissionMetrics').mockReturnValue({
        count: 0,
        approved: 0,
        rejected: 0,
        pendingReview: 0,
      });
      jest.spyOn(service as any, 'calculateTrends').mockReturnValue({
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable',
      });

      const result = await service.getDailyMetrics(leapYearDate);

      expect(result.date).toBe(leapYearDate);
    });

    it('should reject invalid leap year dates', async () => {
      const invalidLeapYearDate = '2023-02-29';

      await expect(service.getDailyMetrics(invalidLeapYearDate))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should handle boundary dates (first and last day of year)', async () => {
      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);
      jest.spyOn(service as any, 'aggregatePostsByState').mockReturnValue({
        draft: 0,
        submitted: 0,
        published: 0,
        rejected: 0,
        revoked: 0,
        archived: 0,
      });
      jest.spyOn(service as any, 'calculateSubmissionMetrics').mockReturnValue({
        count: 0,
        approved: 0,
        rejected: 0,
        pendingReview: 0,
      });
      jest.spyOn(service as any, 'calculateTrends').mockReturnValue({
        mostEngagedPost: null,
        leastEngagedPost: null,
        engagementTrend: 'stable',
      });

      const firstDay = await service.getDailyMetrics('2024-01-01');
      const lastDay = await service.getDailyMetrics('2024-12-31');

      expect(firstDay.date).toBe('2024-01-01');
      expect(lastDay.date).toBe('2024-12-31');
    });
  });
});
