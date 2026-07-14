import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FeedService, PublishedPost, PaginatedFeedResponse } from './feed.service';
import { DatabaseService } from '../database/database.service';

describe('FeedService', () => {
  let service: FeedService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [FeedService, DatabaseService],
    }).compile();

    service = module.get(FeedService);
    databaseService = module.get(DatabaseService);
  });

  describe('getPublishedFeed', () => {
    it('should return empty feed when no posts published', async () => {
      const result = await service.getPublishedFeed('user-1', {
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.pageNumber).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(0);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should return published posts visible to user', async () => {
      const post: PublishedPost = {
        id: 'post-1',
        title: 'Test Post',
        content: 'Test content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'org-wide',
      };

      await service.addPublishedPost(post);

      const result = await service.getPublishedFeed('user-2', {
        page: 1,
        pageSize: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('post-1');
      expect(result.totalCount).toBe(1);
    });

    it('should implement pagination correctly', async () => {
      // Add 25 posts
      for (let i = 1; i <= 25; i++) {
        const post: PublishedPost = {
          id: `post-${i}`,
          title: `Post ${i}`,
          content: `Content ${i}`,
          createdBy: 'user-1',
          createdAt: new Date(Date.now() - i * 1000).toISOString(),
          state: 'PUBLISHED',
          proposedAudience: 'org-wide',
        };
        await service.addPublishedPost(post);
      }

      // Page 1
      const page1 = await service.getPublishedFeed('user-1', {
        page: 1,
        pageSize: 10,
      });

      expect(page1.items).toHaveLength(10);
      expect(page1.pageNumber).toBe(1);
      expect(page1.totalCount).toBe(25);
      expect(page1.totalPages).toBe(3);
      expect(page1.hasNextPage).toBe(true);
      expect(page1.hasPreviousPage).toBe(false);

      // Page 2
      const page2 = await service.getPublishedFeed('user-1', {
        page: 2,
        pageSize: 10,
      });

      expect(page2.items).toHaveLength(10);
      expect(page2.pageNumber).toBe(2);
      expect(page2.hasNextPage).toBe(true);
      expect(page2.hasPreviousPage).toBe(true);

      // Page 3
      const page3 = await service.getPublishedFeed('user-1', {
        page: 3,
        pageSize: 10,
      });

      expect(page3.items).toHaveLength(5);
      expect(page3.pageNumber).toBe(3);
      expect(page3.hasNextPage).toBe(false);
      expect(page3.hasPreviousPage).toBe(true);
    });

    it('should sort posts chronologically (newest first)', async () => {
      const now = Date.now();
      const posts: PublishedPost[] = [
        {
          id: 'post-1',
          title: 'Old Post',
          content: 'Content 1',
          createdBy: 'user-1',
          createdAt: new Date(now - 3000).toISOString(),
          state: 'PUBLISHED',
          proposedAudience: 'org-wide',
        },
        {
          id: 'post-2',
          title: 'Newest Post',
          content: 'Content 2',
          createdBy: 'user-1',
          createdAt: new Date(now).toISOString(),
          state: 'PUBLISHED',
          proposedAudience: 'org-wide',
        },
        {
          id: 'post-3',
          title: 'Middle Post',
          content: 'Content 3',
          createdBy: 'user-1',
          createdAt: new Date(now - 1500).toISOString(),
          state: 'PUBLISHED',
          proposedAudience: 'org-wide',
        },
      ];

      for (const post of posts) {
        await service.addPublishedPost(post);
      }

      const result = await service.getPublishedFeed('user-1', {
        page: 1,
        pageSize: 10,
      });

      expect(result.items[0].id).toBe('post-2'); // Newest
      expect(result.items[1].id).toBe('post-3'); // Middle
      expect(result.items[2].id).toBe('post-1'); // Oldest
    });

    it('should filter by org-wide audience (visible to all)', async () => {
      const post: PublishedPost = {
        id: 'post-1',
        title: 'Org-wide Post',
        content: 'Visible to everyone',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'org-wide',
      };

      await service.addPublishedPost(post);

      // Any user can view org-wide posts
      const result1 = await service.getPublishedFeed('user-2', {
        page: 1,
        pageSize: 10,
        audiences: [],
      });

      expect(result1.items).toHaveLength(1);

      // Even user with no audiences
      const result2 = await service.getPublishedFeed('user-99', {
        page: 1,
        pageSize: 10,
        audiences: [],
      });

      expect(result2.items).toHaveLength(1);
    });

    it('should filter by department-only audience', async () => {
      const deptPost: PublishedPost = {
        id: 'post-dept',
        title: 'Department Post',
        content: 'Only for HR',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'dept-only',
        approvedAudience: 'dept:hr',
      };

      await service.addPublishedPost(deptPost);

      // User in HR sees the post
      const resultHR = await service.getPublishedFeed('user-2', {
        page: 1,
        pageSize: 10,
        audiences: ['dept:hr'],
      });

      expect(resultHR.items).toHaveLength(1);

      // User not in HR doesn't see it
      const resultOther = await service.getPublishedFeed('user-3', {
        page: 1,
        pageSize: 10,
        audiences: ['dept:finance'],
      });

      expect(resultOther.items).toHaveLength(0);
    });

    it('should filter by custom audience', async () => {
      const customPost: PublishedPost = {
        id: 'post-custom',
        title: 'Custom Audience Post',
        content: 'Only for Leadership',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        approvedAudience: 'custom:leadership-team',
      };

      await service.addPublishedPost(customPost);

      // User in custom audience sees it
      const resultLeadership = await service.getPublishedFeed('user-2', {
        page: 1,
        pageSize: 10,
        audiences: ['custom:leadership-team'],
      });

      expect(resultLeadership.items).toHaveLength(1);

      // User not in custom audience doesn't see it
      const resultOther = await service.getPublishedFeed('user-3', {
        page: 1,
        pageSize: 10,
        audiences: [],
      });

      expect(resultOther.items).toHaveLength(0);
    });

    it('should exclude archived posts by default', async () => {
      const post1: PublishedPost = {
        id: 'post-1',
        title: 'Active Post',
        content: 'Still active',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'org-wide',
      };

      const post2: PublishedPost = {
        id: 'post-2',
        title: 'Archived Post',
        content: 'No longer active',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'ARCHIVED',
        proposedAudience: 'org-wide',
      };

      await service.addPublishedPost(post1);
      await service.addPublishedPost(post2);

      const result = await service.getPublishedFeed('user-1', {
        page: 1,
        pageSize: 10,
        excludeArchived: true,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('post-1');
    });

    it('should include archived posts when requested', async () => {
      const post1: PublishedPost = {
        id: 'post-1',
        title: 'Active Post',
        content: 'Still active',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'org-wide',
      };

      const post2: PublishedPost = {
        id: 'post-2',
        title: 'Archived Post',
        content: 'No longer active',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'ARCHIVED',
        proposedAudience: 'org-wide',
      };

      await service.addPublishedPost(post1);
      await service.addPublishedPost(post2);

      const result = await service.getPublishedFeed('user-1', {
        page: 1,
        pageSize: 10,
        excludeArchived: false,
      });

      expect(result.items).toHaveLength(2);
    });

    it('should not include draft posts by default', async () => {
      const draftPost: PublishedPost = {
        id: 'post-draft',
        title: 'My Draft',
        content: 'Draft content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'DRAFT',
      };

      const publishedPost: PublishedPost = {
        id: 'post-published',
        title: 'Published Post',
        content: 'Published content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'org-wide',
      };

      await service.addPublishedPost(draftPost);
      await service.addPublishedPost(publishedPost);

      const result = await service.getPublishedFeed('user-1', {
        page: 1,
        pageSize: 10,
        includeDrafts: false,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('post-published');
    });

    it('should include own draft posts when requested', async () => {
      const draftPost: PublishedPost = {
        id: 'post-draft',
        title: 'My Draft',
        content: 'Draft content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'DRAFT',
      };

      await service.addPublishedPost(draftPost);

      const result = await service.getPublishedFeed('user-1', {
        page: 1,
        pageSize: 10,
        includeDrafts: true,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('post-draft');
    });

    it('should not show other users draft posts even when includeDrafts is true', async () => {
      const draftPost: PublishedPost = {
        id: 'post-draft',
        title: 'Someone Elses Draft',
        content: 'Draft content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'DRAFT',
      };

      await service.addPublishedPost(draftPost);

      const result = await service.getPublishedFeed('user-2', {
        page: 1,
        pageSize: 10,
        includeDrafts: true,
      });

      expect(result.items).toHaveLength(0);
    });

    it('should validate pagination params: page must be positive integer', async () => {
      await expect(
        service.getPublishedFeed('user-1', {
          page: 0,
          pageSize: 10,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.getPublishedFeed('user-1', {
          page: -1,
          pageSize: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate pagination params: pageSize must be positive', async () => {
      await expect(
        service.getPublishedFeed('user-1', {
          page: 1,
          pageSize: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.getPublishedFeed('user-1', {
          page: 1,
          pageSize: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate pagination params: pageSize cannot exceed 100', async () => {
      await expect(
        service.getPublishedFeed('user-1', {
          page: 1,
          pageSize: 101,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate pagination params: required params', async () => {
      await expect(
        service.getPublishedFeed('user-1', null as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addPublishedPost', () => {
    it('should add published post to feed', async () => {
      const post: PublishedPost = {
        id: 'post-1',
        title: 'New Post',
        content: 'Content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'org-wide',
      };

      const result = await service.addPublishedPost(post);

      expect(result.id).toBe('post-1');
      expect(result.state).toBe('PUBLISHED');
    });

    it('should reject draft posts', async () => {
      const post: PublishedPost = {
        id: 'post-1',
        title: 'Draft Post',
        content: 'Content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'DRAFT',
      };

      await expect(service.addPublishedPost(post)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject rejected posts', async () => {
      const post: PublishedPost = {
        id: 'post-1',
        title: 'Rejected Post',
        content: 'Content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'REJECTED',
      };

      await expect(service.addPublishedPost(post)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeFromFeed', () => {
    it('should remove post from feed', async () => {
      const post: PublishedPost = {
        id: 'post-1',
        title: 'Post to Remove',
        content: 'Content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'org-wide',
      };

      await service.addPublishedPost(post);
      const result = await service.removeFromFeed('post-1');

      expect(result?.id).toBe('post-1');

      // Verify it's removed
      const feed = await service.getPublishedFeed('user-1', {
        page: 1,
        pageSize: 10,
      });

      expect(feed.items).toHaveLength(0);
    });

    it('should return undefined when removing non-existent post', async () => {
      const result = await service.removeFromFeed('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getPublishedPost', () => {
    it('should return published post if user can view it', async () => {
      const post: PublishedPost = {
        id: 'post-1',
        title: 'Visible Post',
        content: 'Content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'org-wide',
      };

      await service.addPublishedPost(post);

      const result = await service.getPublishedPost('post-1', 'user-2');

      expect(result?.id).toBe('post-1');
    });

    it('should return undefined for non-existent post', async () => {
      const result = await service.getPublishedPost('non-existent', 'user-1');

      expect(result).toBeUndefined();
    });

    it('should respect audience access control', async () => {
      const post: PublishedPost = {
        id: 'post-1',
        title: 'Dept Post',
        content: 'Content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        approvedAudience: 'dept:hr',
      };

      await service.addPublishedPost(post);

      // User in audience can view
      const result1 = await service.getPublishedPost('post-1', 'user-2', ['dept:hr']);
      expect(result1?.id).toBe('post-1');

      // User not in audience cannot view
      const result2 = await service.getPublishedPost('post-1', 'user-3', ['dept:finance']);
      expect(result2).toBeUndefined();
    });
  });

  describe('updatePostAudience', () => {
    it('should update audience of published post', async () => {
      const post: PublishedPost = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'org-wide',
      };

      await service.addPublishedPost(post);

      const result = await service.updatePostAudience(
        'post-1',
        'dept:hr',
        'admin-1',
      );

      expect(result.approvedAudience).toBe('dept:hr');
      expect(result.approvedBy).toBe('admin-1');
      expect(result.approvedAt).toBeDefined();
    });

    it('should throw when post not found', async () => {
      await expect(
        service.updatePostAudience('non-existent', 'org-wide', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('archivePost', () => {
    it('should archive published post', async () => {
      const post: PublishedPost = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'org-wide',
      };

      await service.addPublishedPost(post);

      const result = await service.archivePost('post-1');

      expect(result.state).toBe('ARCHIVED');
    });

    it('should remove archived post from feed by default', async () => {
      const post: PublishedPost = {
        id: 'post-1',
        title: 'Post',
        content: 'Content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'org-wide',
      };

      await service.addPublishedPost(post);
      await service.archivePost('post-1');

      const result = await service.getPublishedFeed('user-1', {
        page: 1,
        pageSize: 10,
      });

      expect(result.items).toHaveLength(0);
    });

    it('should throw when post not found', async () => {
      await expect(service.archivePost('non-existent')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getFeedStats', () => {
    it('should return feed statistics', async () => {
      const post1: PublishedPost = {
        id: 'post-1',
        title: 'Published',
        content: 'Content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'PUBLISHED',
        proposedAudience: 'org-wide',
      };

      const post2: PublishedPost = {
        id: 'post-2',
        title: 'Archived',
        content: 'Content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'ARCHIVED',
        proposedAudience: 'org-wide',
      };

      const post3: PublishedPost = {
        id: 'post-3',
        title: 'Draft',
        content: 'Content',
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        state: 'DRAFT',
      };

      await service.addPublishedPost(post1);
      await service.addPublishedPost(post2);
      await service.addPublishedPost(post3);

      const stats = await service.getFeedStats();

      expect(stats.totalPublished).toBe(1);
      expect(stats.totalArchived).toBe(1);
      expect(stats.totalDrafts).toBe(1);
    });

    it('should return zero stats for empty feed', async () => {
      const stats = await service.getFeedStats();

      expect(stats.totalPublished).toBe(0);
      expect(stats.totalArchived).toBe(0);
      expect(stats.totalDrafts).toBe(0);
    });
  });

  describe('combined scenarios', () => {
    it('should handle complex filtering and pagination', async () => {
      const now = Date.now();

      // Add 15 posts with mixed audience and timestamps
      for (let i = 1; i <= 15; i++) {
        const audience = i % 3 === 0 ? 'dept:hr' : 'org-wide';
        const post: PublishedPost = {
          id: `post-${i}`,
          title: `Post ${i}`,
          content: `Content ${i}`,
          createdBy: `user-${i % 3}`,
          createdAt: new Date(now - i * 1000).toISOString(),
          state: i === 15 ? 'ARCHIVED' : 'PUBLISHED',
          approvedAudience: audience,
        };
        await service.addPublishedPost(post);
      }

      // User in HR department, page 1
      const result = await service.getPublishedFeed('user-hr', {
        page: 1,
        pageSize: 5,
        audiences: ['dept:hr', 'org-wide'],
        excludeArchived: true,
      });

      expect(result.pageNumber).toBe(1);
      expect(result.pageSize).toBe(5);
      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(result.items[0].createdAt >= result.items[result.items.length - 1].createdAt)
        .toBe(true); // Chronological order
    });
  });
});
