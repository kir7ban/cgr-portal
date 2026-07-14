import { Test } from '@nestjs/testing';
import { EditService } from './edit.service';
import { RevocationService } from './revoke.service';
import { ArchiveService } from './archive.service';
import { AuditTrailService } from './audit.service';
import { AnalyticsService, DailyMetrics } from './analytics.service';
import { PostService } from '../posts/post.service';
import { DatabaseService } from '../database/database.service';
import { ReactionService } from '../engagement/reaction.service';
import { CommentService } from '../engagement/comment.service';
import { ShareService } from '../engagement/share.service';

describe('AdvancedServices', () => {
  let edit: EditService;
  let revoke: RevocationService;
  let archive: ArchiveService;
  let analytics: AnalyticsService;
  let postService: PostService;
  let reactionService: ReactionService;
  let commentService: CommentService;
  let shareService: ShareService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EditService,
        RevocationService,
        ArchiveService,
        AuditTrailService,
        AnalyticsService,
        PostService,
        DatabaseService,
        ReactionService,
        CommentService,
        ShareService,
      ],
    }).compile();
    edit = module.get(EditService);
    revoke = module.get(RevocationService);
    archive = module.get(ArchiveService);
    analytics = module.get(AnalyticsService);
    postService = module.get(PostService);
    reactionService = module.get(ReactionService);
    commentService = module.get(CommentService);
    shareService = module.get(ShareService);
  });

  it('should support all advanced features', () => {
    expect(edit).toBeDefined();
    expect(revoke).toBeDefined();
    expect(archive).toBeDefined();
    expect(analytics).toBeDefined();
  });

  describe('AnalyticsService', () => {
    describe('getDailyMetrics', () => {
      it('should return valid DailyMetrics structure for valid ISO date', async () => {
        const result = await analytics.getDailyMetrics('2026-07-13');
        expect(result).toBeDefined();
        expect(result.date).toBe('2026-07-13');
        expect(result.posts).toBeDefined();
        expect(result.posts.count).toBe(0);
        expect(result.posts.byState).toBeDefined();
        expect(result.submissions).toBeDefined();
        expect(result.engagement).toBeDefined();
        expect(result.postMetrics).toEqual([]);
        expect(result.trends).toBeDefined();
      });

      it('should throw BadRequestException for invalid date format', async () => {
        await expect(analytics.getDailyMetrics('invalid-date')).rejects.toThrow(
          'Invalid date format',
        );
      });

      it('should have correct byState structure', async () => {
        const result = await analytics.getDailyMetrics('2026-07-13');
        expect(result.posts.byState).toEqual({
          draft: 0,
          submitted: 0,
          published: 0,
          rejected: 0,
          revoked: 0,
          archived: 0,
        });
      });

      it('should have correct engagement metrics structure', async () => {
        const result = await analytics.getDailyMetrics('2026-07-13');
        expect(result.engagement).toEqual({
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          averageLikesPerPost: 0,
          averageCommentsPerPost: 0,
          averageSharesPerPost: 0,
        });
      });

      it('should have correct submission metrics structure', async () => {
        const result = await analytics.getDailyMetrics('2026-07-13');
        expect(result.submissions).toEqual({
          count: 0,
          approved: 0,
          rejected: 0,
          pendingReview: 0,
        });
      });

      it('should have correct trends structure', async () => {
        const result = await analytics.getDailyMetrics('2026-07-13');
        expect(result.trends.mostEngagedPost).toBeNull();
        expect(result.trends.leastEngagedPost).toBeNull();
        expect(result.trends.engagementTrend).toMatch(/increasing|stable|decreasing/);
      });

      it('should cache results for subsequent calls', async () => {
        const date = '2026-07-13';
        const result1 = await analytics.getDailyMetrics(date);
        const result2 = await analytics.getDailyMetrics(date);
        expect(result1).toEqual(result2);
      });
    });

    describe('Cache Management', () => {
      it('should clear specific date cache', async () => {
        const date = '2026-07-13';
        await analytics.getDailyMetrics(date);
        analytics.clearCache(date);
        const cached = analytics.getCachedDates();
        expect(cached).not.toContain(date);
      });

      it('should clear all cache when no date specified', async () => {
        await analytics.getDailyMetrics('2026-07-13');
        await analytics.getDailyMetrics('2026-07-12');
        analytics.clearCache();
        expect(analytics.getCachedDates()).toHaveLength(0);
      });

      it('should return cached dates in reverse chronological order', async () => {
        await analytics.getDailyMetrics('2026-07-11');
        await analytics.getDailyMetrics('2026-07-13');
        await analytics.getDailyMetrics('2026-07-12');
        const cached = analytics.getCachedDates();
        expect(cached[0]).toBe('2026-07-13');
        expect(cached[1]).toBe('2026-07-12');
        expect(cached[2]).toBe('2026-07-11');
      });
    });
  });
});
