import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShareService, Share } from './share.service';
import { DatabaseService, Post } from '../database/database.service';

describe('ShareService', () => {
  let service: ShareService;
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = {
      getPost: jest.fn(),
      insertAudit: jest.fn(),
    } as any;

    service = new ShareService(databaseService);
  });

  describe('sharePost()', () => {
    const mockPost: Post = {
      id: 'post-123',
      title: 'Test Post',
      content: 'Content',
      state: 'PUBLISHED',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
    } as Post;

    it('should share post with valid recipients', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      const share = await service.sharePost('post-123', 'user1', ['user2', 'user3']);

      expect(share).toBeDefined();
      expect(share.postId).toBe('post-123');
      expect(share.sharedBy).toBe('user1');
      expect(share.sharedWith).toContain('user2');
      expect(share.sharedWith).toContain('user3');
      expect(share.recipientCount).toBe(2);
    });

    it('should throw BadRequestException if postId missing', async () => {
      await expect(service.sharePost('', 'user1', ['user2']))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException if userId missing', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await expect(service.sharePost('post-123', '', ['user2']))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no recipients provided', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await expect(service.sharePost('post-123', 'user1', []))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException if more than 100 recipients', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      const tooManyRecipients = Array.from({ length: 101 }, (_, i) => `user${i}`);

      await expect(service.sharePost('post-123', 'user1', tooManyRecipients))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw NotFoundException if post not found', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(null);

      await expect(service.sharePost('non-existent', 'user1', ['user2']))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should reject sharing DRAFT posts', async () => {
      const draftPost = { ...mockPost, state: 'DRAFT' };
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(draftPost);

      await expect(service.sharePost('post-123', 'user1', ['user2']))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should reject sharing SUBMITTED posts', async () => {
      const submittedPost = { ...mockPost, state: 'SUBMITTED' };
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(submittedPost);

      await expect(service.sharePost('post-123', 'user1', ['user2']))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should reject sharing REJECTED posts', async () => {
      const rejectedPost = { ...mockPost, state: 'REJECTED' };
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(rejectedPost);

      await expect(service.sharePost('post-123', 'user1', ['user2']))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should allow sharing ARCHIVED posts', async () => {
      const archivedPost = { ...mockPost, state: 'ARCHIVED' };
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(archivedPost);

      const share = await service.sharePost('post-123', 'user1', ['user2']);

      expect(share).toBeDefined();
    });

    it('should throw ForbiddenException if sharing with self', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await expect(service.sharePost('post-123', 'user1', ['user1']))
        .rejects
        .toThrow(ForbiddenException);
    });

    it('should remove duplicates from recipient list', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      const share = await service.sharePost('post-123', 'user1', [
        'user2',
        'user2',
        'user3',
        'user3',
      ]);

      expect(share.recipientCount).toBe(2);
      expect(new Set(share.sharedWith).size).toBe(2);
    });

    it('should filter empty recipient IDs', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      const share = await service.sharePost('post-123', 'user1', [
        'user2',
        '',
        'user3',
        '  ',
      ]);

      expect(share.recipientCount).toBe(2);
      expect(share.sharedWith).toEqual(expect.arrayContaining(['user2', 'user3']));
    });

    it('should create audit trail entry', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);
      const insertAuditSpy = jest.spyOn(databaseService, 'insertAudit');

      await service.sharePost('post-123', 'user1', ['user2']);

      expect(insertAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'share_post',
          actor: 'user1',
          resource: 'post',
          resourceId: 'post-123',
        }),
      );
    });
  });

  describe('getShare()', () => {
    const mockPost: Post = {
      id: 'post-123',
      title: 'Test Post',
      content: 'Content',
      state: 'PUBLISHED',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
    } as Post;

    it('should retrieve share by ID', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      const created = await service.sharePost('post-123', 'user1', ['user2']);
      const retrieved = await service.getShare(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundException for non-existent share', async () => {
      await expect(service.getShare('non-existent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('getSharesForPost()', () => {
    const mockPost: Post = {
      id: 'post-123',
      title: 'Test Post',
      content: 'Content',
      state: 'PUBLISHED',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
    } as Post;

    it('should return all shares for a post', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await service.sharePost('post-123', 'user1', ['user2']);
      await service.sharePost('post-123', 'user3', ['user4']);

      const shares = await service.getSharesForPost('post-123');

      expect(shares).toHaveLength(2);
    });

    it('should return empty array for post with no shares', async () => {
      const shares = await service.getSharesForPost('non-existent');
      expect(shares).toEqual([]);
    });
  });

  describe('getShareCount()', () => {
    const mockPost: Post = {
      id: 'post-123',
      title: 'Test Post',
      content: 'Content',
      state: 'PUBLISHED',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
    } as Post;

    it('should return correct share count', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await service.sharePost('post-123', 'user1', ['user2']);
      await service.sharePost('post-123', 'user3', ['user4']);

      const count = await service.getShareCount('post-123');

      expect(count).toBe(2);
    });

    it('should return 0 for post with no shares', async () => {
      const count = await service.getShareCount('non-existent');
      expect(count).toBe(0);
    });
  });

  describe('getShareReach()', () => {
    const mockPost: Post = {
      id: 'post-123',
      title: 'Test Post',
      content: 'Content',
      state: 'PUBLISHED',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
    } as Post;

    it('should return count of unique recipients', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await service.sharePost('post-123', 'user1', ['user2', 'user3']);
      await service.sharePost('post-123', 'user4', ['user3', 'user5']);

      const reach = await service.getShareReach('post-123');

      expect(reach).toBe(4); // user2, user3, user5 (user3 counted once)
    });

    it('should return 0 for post with no shares', async () => {
      const reach = await service.getShareReach('non-existent');
      expect(reach).toBe(0);
    });
  });

  describe('getSharesByUser()', () => {
    const mockPost: Post = {
      id: 'post-123',
      title: 'Test Post',
      content: 'Content',
      state: 'PUBLISHED',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
    } as Post;

    it('should return shares created by specific user', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await service.sharePost('post-123', 'user1', ['user2']);
      await service.sharePost('post-123', 'user1', ['user3']);

      const shares = await service.getSharesByUser('user1');

      expect(shares).toHaveLength(2);
      expect(shares.every((s) => s.sharedBy === 'user1')).toBe(true);
    });

    it('should return empty array for user with no shares', async () => {
      const shares = await service.getSharesByUser('user-no-shares');
      expect(shares).toEqual([]);
    });
  });

  describe('getRecentShares()', () => {
    const mockPost: Post = {
      id: 'post-123',
      title: 'Test Post',
      content: 'Content',
      state: 'PUBLISHED',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
    } as Post;

    it('should return shares sorted by timestamp descending', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await service.sharePost('post-123', 'user1', ['user2']);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.sharePost('post-123', 'user3', ['user4']);

      const recent = await service.getRecentShares();

      expect(recent.length).toBeGreaterThanOrEqual(2);
      expect(new Date(recent[0].sharedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(recent[1].sharedAt).getTime(),
      );
    });

    it('should respect limit parameter', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await service.sharePost('post-123', 'user1', ['user2']);
      await service.sharePost('post-123', 'user3', ['user4']);

      const recent = await service.getRecentShares(1);

      expect(recent).toHaveLength(1);
    });

    it('should cap limit at 100', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await service.sharePost('post-123', 'user1', ['user2']);

      const recent = await service.getRecentShares(200);

      expect(recent.length).toBeLessThanOrEqual(100);
    });

    it('should return empty array when no shares exist', async () => {
      const recent = await service.getRecentShares();
      expect(recent).toEqual([]);
    });
  });

  describe('getShareStats()', () => {
    const mockPost: Post = {
      id: 'post-123',
      title: 'Test Post',
      content: 'Content',
      state: 'PUBLISHED',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
    } as Post;

    it('should return share statistics', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await service.sharePost('post-123', 'user1', ['user2', 'user3']);
      await service.sharePost('post-123', 'user4', ['user3', 'user5']);

      const stats = await service.getShareStats('post-123');

      expect(stats).toBeDefined();
      expect(stats.totalShares).toBe(2);
      expect(stats.uniqueRecipients).toBe(4);
      expect(stats.sharingUsers).toBe(2);
      expect(stats.lastSharedAt).toBeDefined();
    });

    it('should return zero stats for post with no shares', async () => {
      const stats = await service.getShareStats('non-existent');

      expect(stats.totalShares).toBe(0);
      expect(stats.uniqueRecipients).toBe(0);
      expect(stats.sharingUsers).toBe(0);
      expect(stats.lastSharedAt).toBeUndefined();
    });

    it('should count unique recipients correctly', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await service.sharePost('post-123', 'user1', ['user2', 'user3']);
      await service.sharePost('post-123', 'user1', ['user2', 'user4']);

      const stats = await service.getShareStats('post-123');

      expect(stats.uniqueRecipients).toBe(3); // user2, user3, user4
    });

    it('should count sharing users correctly', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await service.sharePost('post-123', 'user1', ['user5']);
      await service.sharePost('post-123', 'user2', ['user6']);
      await service.sharePost('post-123', 'user1', ['user7']);

      const stats = await service.getShareStats('post-123');

      expect(stats.sharingUsers).toBe(2); // user1, user2
    });

    it('should track most recent share timestamp', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      await service.sharePost('post-123', 'user1', ['user2']);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const secondShare = await service.sharePost('post-123', 'user3', ['user4']);

      const stats = await service.getShareStats('post-123');

      expect(stats.lastSharedAt).toBe(secondShare.sharedAt);
    });
  });

  describe('Edge cases', () => {
    const mockPost: Post = {
      id: 'post-123',
      title: 'Test Post',
      content: 'Content',
      state: 'PUBLISHED',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
    } as Post;

    it('should handle single recipient', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      const share = await service.sharePost('post-123', 'user1', ['user2']);

      expect(share.recipientCount).toBe(1);
      expect(share.sharedWith).toEqual(['user2']);
    });

    it('should handle maximum recipients (100)', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      const recipients = Array.from({ length: 100 }, (_, i) => `user${i}`);
      const share = await service.sharePost('post-123', 'user-sharer', recipients);

      expect(share.recipientCount).toBe(100);
    });

    it('should generate unique share IDs', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      const share1 = await service.sharePost('post-123', 'user1', ['user2']);
      const share2 = await service.sharePost('post-123', 'user3', ['user4']);

      expect(share1.id).not.toBe(share2.id);
    });

    it('should track share timestamp correctly', async () => {
      jest.spyOn(databaseService, 'getPost').mockResolvedValue(mockPost);

      const before = new Date().toISOString();
      const share = await service.sharePost('post-123', 'user1', ['user2']);
      const after = new Date().toISOString();

      expect(share.sharedAt).toBeGreaterThanOrEqual(before);
      expect(share.sharedAt).toBeLessThanOrEqual(after);
    });
  });
});
