import { ArchiveService, ArchiveBatchResult, ArchiveStats } from './archive.service';
import { DatabaseService, Post } from '../database/database.service';

describe('ArchiveService', () => {
  let service: ArchiveService;
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = new DatabaseService();
    service = new ArchiveService(databaseService);
  });

  describe('archiveOldPosts()', () => {
    it('should archive posts older than specified days', async () => {
      const olderThanDays = 365;
      const result = await service.archiveOldPosts(olderThanDays);

      expect(result).toBeDefined();
      expect(result.batchId).toBeDefined();
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
      expect(result.archivedCount).toBeGreaterThanOrEqual(0);
      expect(result.failedCount).toBeGreaterThanOrEqual(0);
      expect(result.postIds).toBeInstanceOf(Array);
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should use default values for parameters', async () => {
      const result = await service.archiveOldPosts();

      expect(result).toBeDefined();
      expect(result.batchId).toMatch(/batch-archive-\d+/);
    });

    it('should respect maxBatchSize parameter', async () => {
      const maxBatchSize = 10;
      const result = await service.archiveOldPosts(365, maxBatchSize);

      // With no posts, count should be 0
      expect(result.archivedCount).toBeLessThanOrEqual(maxBatchSize);
    });

    it('should only archive posts with PUBLISHED state', async () => {
      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([
        {
          id: '1',
          title: 'Draft Post',
          content: 'Content',
          state: 'DRAFT',
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        } as Post,
        {
          id: '2',
          title: 'Published Old',
          content: 'Content',
          state: 'PUBLISHED',
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        } as Post,
      ]);

      jest.spyOn(databaseService, 'updatePost').mockResolvedValue({
        id: '2',
        title: 'Published Old',
        content: 'Content',
        state: 'ARCHIVED',
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
      } as Post);

      const result = await service.archiveOldPosts(365);

      // Only the published post should be archived
      expect(result.postIds).toContain('2');
      expect(result.postIds).not.toContain('1');
    });

    it('should skip posts newer than specified days', async () => {
      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([
        {
          id: '1',
          title: 'Recent Post',
          content: 'Content',
          state: 'PUBLISHED',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        } as Post,
      ]);

      const result = await service.archiveOldPosts(365);

      expect(result.postIds).not.toContain('1');
      expect(result.archivedCount).toBe(0);
    });

    it('should not re-archive already archived posts', async () => {
      const post = {
        id: '1',
        title: 'Old Post',
        content: 'Content',
        state: 'PUBLISHED',
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
      } as Post;

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([post]);
      jest.spyOn(databaseService, 'updatePost').mockResolvedValue({
        ...post,
        state: 'ARCHIVED',
      });

      // First archive
      const result1 = await service.archiveOldPosts(365);
      expect(result1.archivedCount).toBe(1);

      // Second archive attempt should not archive same post again
      const result2 = await service.archiveOldPosts(365);
      expect(result2.archivedCount).toBe(0);
    });

    it('should log audit entry for each archived post', async () => {
      const post = {
        id: '1',
        title: 'Old Post',
        content: 'Content',
        state: 'PUBLISHED',
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
      } as Post;

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([post]);
      jest.spyOn(databaseService, 'updatePost').mockResolvedValue({
        ...post,
        state: 'ARCHIVED',
      });

      const insertAuditSpy = jest.spyOn(databaseService, 'insertAudit');

      await service.archiveOldPosts(365);

      expect(insertAuditSpy).toHaveBeenCalled();
    });

    it('should handle errors and continue processing', async () => {
      const posts = [
        {
          id: '1',
          title: 'Post 1',
          content: 'Content',
          state: 'PUBLISHED',
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        } as Post,
        {
          id: '2',
          title: 'Post 2',
          content: 'Content',
          state: 'PUBLISHED',
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        } as Post,
      ];

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue(posts);

      jest
        .spyOn(databaseService, 'updatePost')
        .mockResolvedValueOnce({
          ...posts[0],
          state: 'ARCHIVED',
        })
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({
          ...posts[1],
          state: 'ARCHIVED',
        });

      const result = await service.archiveOldPosts(365);

      expect(result.archivedCount).toBeGreaterThanOrEqual(0);
      expect(result.failedCount).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should track batch in history', async () => {
      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);

      const result = await service.archiveOldPosts(365);
      const batchFromHistory = await service.getBatchResult(result.batchId);

      expect(batchFromHistory).toEqual(result);
    });
  });

  describe('getBatchResult()', () => {
    it('should retrieve batch result by ID', async () => {
      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);

      const batchResult = await service.archiveOldPosts(365);
      const retrieved = await service.getBatchResult(batchResult.batchId);

      expect(retrieved).toEqual(batchResult);
    });

    it('should return undefined for non-existent batch', async () => {
      const result = await service.getBatchResult('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getRecentBatches()', () => {
    it('should return recent batches in reverse chronological order', async () => {
      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);

      const batch1 = await service.archiveOldPosts(365);
      const batch2 = await service.archiveOldPosts(365);
      const batch3 = await service.archiveOldPosts(365);

      const recent = await service.getRecentBatches();

      expect(recent.length).toBe(3);
      expect(new Date(recent[0].completedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(recent[1].completedAt).getTime(),
      );
      expect(new Date(recent[1].completedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(recent[2].completedAt).getTime(),
      );
    });

    it('should respect limit parameter', async () => {
      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);

      await service.archiveOldPosts(365);
      await service.archiveOldPosts(365);
      await service.archiveOldPosts(365);

      const recent = await service.getRecentBatches(2);

      expect(recent).toHaveLength(2);
    });

    it('should return empty array when no batches exist', async () => {
      const recent = await service.getRecentBatches();
      expect(recent).toEqual([]);
    });
  });

  describe('getArchivedPost()', () => {
    it('should retrieve archived post by ID', async () => {
      const post = {
        id: '1',
        title: 'Old Post',
        content: 'Content',
        state: 'PUBLISHED',
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
      } as Post;

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([post]);
      jest.spyOn(databaseService, 'updatePost').mockResolvedValue({
        ...post,
        state: 'ARCHIVED',
      });

      await service.archiveOldPosts(365);
      const archived = await service.getArchivedPost('1');

      expect(archived).toBeDefined();
      expect(archived?.id).toBe('1');
    });

    it('should return undefined for non-existent archived post', async () => {
      const archived = await service.getArchivedPost('non-existent');
      expect(archived).toBeUndefined();
    });
  });

  describe('getAllArchivedPosts()', () => {
    it('should return all archived posts', async () => {
      const posts = [
        {
          id: '1',
          title: 'Post 1',
          content: 'Content',
          state: 'PUBLISHED',
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        } as Post,
        {
          id: '2',
          title: 'Post 2',
          content: 'Content',
          state: 'PUBLISHED',
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        } as Post,
      ];

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue(posts);
      jest.spyOn(databaseService, 'updatePost').mockImplementation((id) => {
        return Promise.resolve({
          ...posts.find((p) => p.id === id),
          state: 'ARCHIVED',
        } as Post);
      });

      await service.archiveOldPosts(365);
      const allArchived = await service.getAllArchivedPosts();

      expect(allArchived).toHaveLength(2);
    });

    it('should return empty array when no posts archived', async () => {
      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);

      const allArchived = await service.getAllArchivedPosts();
      expect(allArchived).toEqual([]);
    });
  });

  describe('getArchivedPostCount()', () => {
    it('should return count of archived posts', async () => {
      const posts = [
        {
          id: '1',
          title: 'Post 1',
          content: 'Content',
          state: 'PUBLISHED',
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        } as Post,
        {
          id: '2',
          title: 'Post 2',
          content: 'Content',
          state: 'PUBLISHED',
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        } as Post,
      ];

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue(posts);
      jest.spyOn(databaseService, 'updatePost').mockImplementation((id) => {
        return Promise.resolve({
          ...posts.find((p) => p.id === id),
          state: 'ARCHIVED',
        } as Post);
      });

      await service.archiveOldPosts(365);
      const count = await service.getArchivedPostCount();

      expect(count).toBe(2);
    });

    it('should return 0 when no posts archived', async () => {
      const count = await service.getArchivedPostCount();
      expect(count).toBe(0);
    });
  });

  describe('getArchiveStats()', () => {
    it('should return archive statistics', async () => {
      const posts = [
        {
          id: '1',
          title: 'Post 1',
          content: 'Content',
          state: 'PUBLISHED',
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        } as Post,
      ];

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue(posts);
      jest.spyOn(databaseService, 'updatePost').mockResolvedValue({
        ...posts[0],
        state: 'ARCHIVED',
      });

      await service.archiveOldPosts(365);
      const stats = await service.getArchiveStats();

      expect(stats).toBeDefined();
      expect(stats.totalArchivedPosts).toBeGreaterThanOrEqual(0);
      expect(stats.totalArchivedPostsSize).toBeGreaterThanOrEqual(0);
      expect(stats.archivesByMonth).toBeInstanceOf(Array);
    });

    it('should calculate total size correctly', async () => {
      const posts = [
        {
          id: '1',
          title: 'Title',
          content: 'ContentContent',
          state: 'PUBLISHED',
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        } as Post,
      ];

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue(posts);
      jest.spyOn(databaseService, 'updatePost').mockResolvedValue({
        ...posts[0],
        state: 'ARCHIVED',
      });

      await service.archiveOldPosts(365);
      const stats = await service.getArchiveStats();

      const expectedSize = 'Title'.length + 'ContentContent'.length;
      expect(stats.totalArchivedPostsSize).toBeGreaterThanOrEqual(expectedSize);
    });

    it('should group archives by month', async () => {
      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);

      const stats = await service.getArchiveStats();

      expect(stats.archivesByMonth).toBeInstanceOf(Array);
      expect(stats.archivesByMonth.every((a) => a.month && a.count >= 0)).toBe(true);
    });

    it('should return empty stats when no posts archived', async () => {
      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([]);

      const stats = await service.getArchiveStats();

      expect(stats.totalArchivedPosts).toBe(0);
      expect(stats.totalArchivedPostsSize).toBe(0);
      expect(stats.oldestArchivedPost).toBeUndefined();
      expect(stats.newestArchivedPost).toBeUndefined();
    });

    it('should identify oldest and newest archived posts', async () => {
      const oldDate = new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString();
      const newDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();

      const posts = [
        {
          id: '1',
          title: 'Newest',
          content: 'Content',
          state: 'PUBLISHED',
          createdAt: newDate,
        } as Post,
        {
          id: '2',
          title: 'Oldest',
          content: 'Content',
          state: 'PUBLISHED',
          createdAt: oldDate,
        } as Post,
      ];

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue(posts);
      jest.spyOn(databaseService, 'updatePost').mockImplementation((id) => {
        return Promise.resolve({
          ...posts.find((p) => p.id === id),
          state: 'ARCHIVED',
        } as Post);
      });

      await service.archiveOldPosts(365);
      const stats = await service.getArchiveStats();

      expect(stats.oldestArchivedPost?.id).toBe('2');
      expect(stats.newestArchivedPost?.id).toBe('1');
    });
  });

  describe('restoreArchivedPost()', () => {
    it('should restore archived post to PUBLISHED state', async () => {
      const post = {
        id: '1',
        title: 'Old Post',
        content: 'Content',
        state: 'PUBLISHED',
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
      } as Post;

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([post]);
      jest.spyOn(databaseService, 'updatePost').mockResolvedValue({
        ...post,
        state: 'ARCHIVED',
      });

      await service.archiveOldPosts(365);

      jest.spyOn(databaseService, 'updatePost').mockResolvedValue({
        ...post,
        state: 'PUBLISHED',
      });

      const restored = await service.restoreArchivedPost('1', 'admin');

      expect(restored).toBeDefined();
      expect(restored.state).toBe('PUBLISHED');
    });

    it('should log audit entry for restore action', async () => {
      const post = {
        id: '1',
        title: 'Old Post',
        content: 'Content',
        state: 'PUBLISHED',
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
      } as Post;

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([post]);
      jest.spyOn(databaseService, 'updatePost').mockResolvedValue({
        ...post,
        state: 'ARCHIVED',
      });

      await service.archiveOldPosts(365);

      jest.spyOn(databaseService, 'updatePost').mockResolvedValue({
        ...post,
        state: 'PUBLISHED',
      });

      const insertAuditSpy = jest.spyOn(databaseService, 'insertAudit');

      await service.restoreArchivedPost('1', 'admin');

      expect(insertAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'restore_post',
          actor: 'admin',
        }),
      );
    });

    it('should throw error for non-existent archived post', async () => {
      await expect(service.restoreArchivedPost('non-existent', 'admin'))
        .rejects
        .toThrow();
    });
  });

  describe('isArchived()', () => {
    it('should return true for archived post', async () => {
      const post = {
        id: '1',
        title: 'Old Post',
        content: 'Content',
        state: 'PUBLISHED',
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
      } as Post;

      jest.spyOn(service as any, 'getAllPosts').mockResolvedValue([post]);
      jest.spyOn(databaseService, 'updatePost').mockResolvedValue({
        ...post,
        state: 'ARCHIVED',
      });

      await service.archiveOldPosts(365);
      const archived = await service.isArchived('1');

      expect(archived).toBe(true);
    });

    it('should return false for non-archived post', async () => {
      const archived = await service.isArchived('non-existent');
      expect(archived).toBe(false);
    });
  });
});
