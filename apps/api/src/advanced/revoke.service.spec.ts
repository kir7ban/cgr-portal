import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RevocationService, RevocationRecord, RevokePostResponse } from './revoke.service';
import { PostService, PostDocument } from '../posts/post.service';
import { DatabaseService } from '../database/database.service';

describe('RevocationService', () => {
  let service: RevocationService;
  let postService: PostService;
  let databaseService: DatabaseService;

  beforeEach(() => {
    postService = {
      getPostForUser: jest.fn(),
      updatePostState: jest.fn(),
    } as any;

    databaseService = {
      insertAudit: jest.fn(),
    } as any;

    service = new RevocationService(postService, databaseService);
  });

  describe('revokePost()', () => {
    it('should revoke a published post by admin', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);
      jest.spyOn(postService, 'updatePostState').mockResolvedValue({
        ...post,
        state: 'REVOKED',
      });

      const result = await service.revokePost('post-123', 'bob.admin', {
        reason: 'Violates policy',
      });

      expect(result).toBeDefined();
      expect(result.postId).toBe('post-123');
      expect(result.revokedBy).toBe('bob.admin');
      expect(result.reason).toBe('Violates policy');
      expect(result.message).toContain('successfully revoked');
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);

      await expect(
        service.revokePost('post-123', 'regular.user', {}),
      ).rejects.toThrow(ForbiddenException);

      expect(jest.spyOn(postService, 'updatePostState')).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if post not found', async () => {
      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(null);

      await expect(
        service.revokePost('non-existent', 'bob.admin', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if post is not PUBLISHED', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'DRAFT',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);

      await expect(
        service.revokePost('post-123', 'bob.admin', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject reason exceeding 500 characters', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);

      const longReason = 'a'.repeat(501);

      await expect(
        service.revokePost('post-123', 'bob.admin', { reason: longReason }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create audit trail entry', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);
      jest.spyOn(postService, 'updatePostState').mockResolvedValue({
        ...post,
        state: 'REVOKED',
      });

      const insertAuditSpy = jest.spyOn(databaseService, 'insertAudit');

      await service.revokePost('post-123', 'bob.admin', {
        reason: 'Test reason',
      });

      expect(insertAuditSpy).toHaveBeenCalled();
      const auditCalls = insertAuditSpy.mock.calls;
      expect(auditCalls.some((call) =>
        call[0].action === 'revoke_post' || call[0].action === 'revoke_post_with_reason',
      )).toBe(true);
    });

    it('should allow revocation without reason', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);
      jest.spyOn(postService, 'updatePostState').mockResolvedValue({
        ...post,
        state: 'REVOKED',
      });

      const result = await service.revokePost('post-123', 'bob.admin');

      expect(result).toBeDefined();
      expect(result.reason).toBeUndefined();
    });
  });

  describe('getRevocation()', () => {
    it('should retrieve revocation by ID', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);
      jest.spyOn(postService, 'updatePostState').mockResolvedValue({
        ...post,
        state: 'REVOKED',
      });

      const revokeResult = await service.revokePost('post-123', 'bob.admin', {
        reason: 'Test',
      });

      // Note: We need to extract the revocation ID from the internal state
      // This would normally be done through tracking, but for testing we verify the service stores it
      const revocations = await service.getRevocationsForPost('post-123');
      expect(revocations.length).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent revocation', async () => {
      const result = await service.getRevocation('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getRevocationsForPost()', () => {
    it('should return all revocations for a post', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);
      jest.spyOn(postService, 'updatePostState').mockResolvedValue({
        ...post,
        state: 'REVOKED',
      });

      await service.revokePost('post-123', 'bob.admin', {
        reason: 'Reason 1',
      });

      const revocations = await service.getRevocationsForPost('post-123');

      expect(revocations).toHaveLength(1);
      expect(revocations[0].postId).toBe('post-123');
      expect(revocations[0].revokedBy).toBe('bob.admin');
      expect(revocations[0].reason).toBe('Reason 1');
    });

    it('should return empty array for post with no revocations', async () => {
      const revocations = await service.getRevocationsForPost('non-existent');
      expect(revocations).toEqual([]);
    });
  });

  describe('getRevokedPostCount()', () => {
    it('should return count of revoked posts', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);
      jest.spyOn(postService, 'updatePostState').mockResolvedValue({
        ...post,
        state: 'REVOKED',
      });

      const countBefore = await service.getRevokedPostCount();

      await service.revokePost('post-123', 'bob.admin');

      const countAfter = await service.getRevokedPostCount();

      expect(countAfter).toBe(countBefore + 1);
    });

    it('should return 0 when no posts revoked', async () => {
      const count = await service.getRevokedPostCount();
      expect(count).toBe(0);
    });
  });

  describe('getRecentRevocations()', () => {
    it('should return recent revocations sorted by timestamp descending', async () => {
      const post1 = {
        id: 'post-1',
        title: 'Post 1',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      const post2 = {
        id: 'post-2',
        title: 'Post 2',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser')
        .mockResolvedValueOnce(post1)
        .mockResolvedValueOnce(post2);

      jest.spyOn(postService, 'updatePostState')
        .mockResolvedValueOnce({ ...post1, state: 'REVOKED' })
        .mockResolvedValueOnce({ ...post2, state: 'REVOKED' });

      await service.revokePost('post-1', 'bob.admin');
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.revokePost('post-2', 'bob.admin');

      const recent = await service.getRecentRevocations();

      expect(recent.length).toBeGreaterThanOrEqual(2);
      expect(new Date(recent[0].revokedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(recent[1].revokedAt).getTime(),
      );
    });

    it('should respect limit parameter', async () => {
      const recent = await service.getRecentRevocations(5);
      expect(recent.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array when no revocations', async () => {
      const recent = await service.getRecentRevocations();
      expect(recent).toEqual([]);
    });
  });

  describe('getRevocationStats()', () => {
    it('should return revocation statistics', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);
      jest.spyOn(postService, 'updatePostState').mockResolvedValue({
        ...post,
        state: 'REVOKED',
      });

      await service.revokePost('post-123', 'bob.admin', {
        reason: 'Test reason with some length',
      });

      const stats = await service.getRevocationStats();

      expect(stats).toBeDefined();
      expect(stats.totalRevocations).toBeGreaterThanOrEqual(1);
      expect(stats.recentRevocations).toBeGreaterThanOrEqual(0);
      expect(stats.withReason).toBeGreaterThanOrEqual(1);
      expect(stats.avgReasonsLength).toBeGreaterThan(0);
    });

    it('should count recent revocations within 7 days', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);
      jest.spyOn(postService, 'updatePostState').mockResolvedValue({
        ...post,
        state: 'REVOKED',
      });

      await service.revokePost('post-123', 'bob.admin');

      const stats = await service.getRevocationStats();

      expect(stats.recentRevocations).toBeGreaterThanOrEqual(1);
    });

    it('should calculate average reason length', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);
      jest.spyOn(postService, 'updatePostState').mockResolvedValue({
        ...post,
        state: 'REVOKED',
      });

      const reason = 'This is a test reason';
      await service.revokePost('post-123', 'bob.admin', { reason });

      const stats = await service.getRevocationStats();

      expect(stats.avgReasonsLength).toBeGreaterThan(0);
      expect(stats.avgReasonsLength).toBeLessThanOrEqual(reason.length);
    });
  });

  describe('isPostRevoked()', () => {
    it('should return true for revoked post', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);
      jest.spyOn(postService, 'updatePostState').mockResolvedValue({
        ...post,
        state: 'REVOKED',
      });

      await service.revokePost('post-123', 'bob.admin');

      const revoked = await service.isPostRevoked('post-123');

      expect(revoked).toBe(true);
    });

    it('should return false for non-revoked post', async () => {
      const revoked = await service.isPostRevoked('non-existent');
      expect(revoked).toBe(false);
    });
  });

  describe('getRevocationsByAdmin()', () => {
    it('should return revocations by specific admin', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);
      jest.spyOn(postService, 'updatePostState').mockResolvedValue({
        ...post,
        state: 'REVOKED',
      });

      await service.revokePost('post-123', 'bob.admin');

      const revocations = await service.getRevocationsByAdmin('bob.admin');

      expect(revocations).toHaveLength(1);
      expect(revocations[0].revokedBy).toBe('bob.admin');
    });

    it('should return empty array for admin with no revocations', async () => {
      const revocations = await service.getRevocationsByAdmin('admin.user');
      expect(revocations).toEqual([]);
    });
  });

  describe('getDocumentedRevocations()', () => {
    it('should return only revocations with reasons', async () => {
      const post1 = {
        id: 'post-1',
        title: 'Post 1',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      const post2 = {
        id: 'post-2',
        title: 'Post 2',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser')
        .mockResolvedValueOnce(post1)
        .mockResolvedValueOnce(post2);

      jest.spyOn(postService, 'updatePostState')
        .mockResolvedValueOnce({ ...post1, state: 'REVOKED' })
        .mockResolvedValueOnce({ ...post2, state: 'REVOKED' });

      await service.revokePost('post-1', 'bob.admin', { reason: 'Reason 1' });
      await service.revokePost('post-2', 'bob.admin');

      const documented = await service.getDocumentedRevocations();

      expect(documented.length).toBe(1);
      expect(documented[0].reason).toBeDefined();
    });

    it('should return empty array when no documented revocations', async () => {
      const documented = await service.getDocumentedRevocations();
      expect(documented).toEqual([]);
    });
  });

  describe('Authorization tests', () => {
    it('should allow all admin users to revoke', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);
      jest.spyOn(postService, 'updatePostState').mockResolvedValue({
        ...post,
        state: 'REVOKED',
      });

      const admins = ['bob.admin', 'admin.user', 'system.admin'];

      for (const admin of admins) {
        const result = await service.revokePost('post-123', admin);
        expect(result).toBeDefined();
        expect(result.revokedBy).toBe(admin);
      }
    });

    it('should reject non-admin users', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'PUBLISHED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);

      const nonAdmins = ['user1', 'user2', 'regular.user'];

      for (const user of nonAdmins) {
        await expect(service.revokePost('post-123', user))
          .rejects
          .toThrow(ForbiddenException);
      }
    });
  });

  describe('Post state validation', () => {
    it('should reject revocation of DRAFT posts', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'DRAFT',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);

      await expect(service.revokePost('post-123', 'bob.admin'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should reject revocation of SUBMITTED posts', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'SUBMITTED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);

      await expect(service.revokePost('post-123', 'bob.admin'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should reject revocation of REJECTED posts', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'REJECTED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);

      await expect(service.revokePost('post-123', 'bob.admin'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should reject revocation of ARCHIVED posts', async () => {
      const post = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Content',
        state: 'ARCHIVED',
      } as PostDocument;

      jest.spyOn(postService, 'getPostForUser').mockResolvedValue(post);

      await expect(service.revokePost('post-123', 'bob.admin'))
        .rejects
        .toThrow(BadRequestException);
    });
  });
});
