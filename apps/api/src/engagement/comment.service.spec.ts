import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentService, Comment, PaginatedCommentsResponse } from './comment.service';
import { DatabaseService } from '../database/database.service';

describe('CommentService', () => {
  let service: CommentService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommentService, DatabaseService],
    }).compile();

    service = module.get<CommentService>(CommentService);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  describe('addComment', () => {
    it('should create a comment with valid inputs', async () => {
      const result = await service.addComment('post-1', 'user-1', 'Great post!');

      expect(result).toHaveProperty('id');
      expect(result.postId).toBe('post-1');
      expect(result.userId).toBe('user-1');
      expect(result.text).toBe('Great post!');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should generate unique comment IDs', async () => {
      const result1 = await service.addComment('post-1', 'user-1', 'Comment 1');
      const result2 = await service.addComment('post-1', 'user-1', 'Comment 2');

      expect(result1.id).not.toBe(result2.id);
    });

    it('should trim whitespace from inputs', async () => {
      const result = await service.addComment('  post-1  ', '  user-1  ', '  Great!  ');

      expect(result.postId).toBe('post-1');
      expect(result.userId).toBe('user-1');
      expect(result.text).toBe('Great!');
    });

    it('should throw BadRequestException if postId is missing', async () => {
      await expect(service.addComment('', 'user-1', 'text')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if postId is null', async () => {
      await expect(service.addComment(null as any, 'user-1', 'text')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if userId is missing', async () => {
      await expect(service.addComment('post-1', '', 'text')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if userId is null', async () => {
      await expect(service.addComment('post-1', null as any, 'text')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if text is missing', async () => {
      await expect(service.addComment('post-1', 'user-1', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if text is null', async () => {
      await expect(service.addComment('post-1', 'user-1', null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if text is only whitespace', async () => {
      await expect(service.addComment('post-1', 'user-1', '   ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if text exceeds 5000 characters', async () => {
      const longText = 'a'.repeat(5001);
      await expect(service.addComment('post-1', 'user-1', longText)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept text at exactly 5000 characters', async () => {
      const maxText = 'a'.repeat(5000);
      const result = await service.addComment('post-1', 'user-1', maxText);

      expect(result.text.length).toBe(5000);
    });

    it('should set createdAt and updatedAt to same time on creation', async () => {
      const result = await service.addComment('post-1', 'user-1', 'text');

      expect(result.createdAt).toBe(result.updatedAt);
    });

    it('should create audit entry on successful comment creation', async () => {
      const insertAuditSpy = jest.spyOn(databaseService, 'insertAudit');
      await service.addComment('post-1', 'user-1', 'text');

      expect(insertAuditSpy).toHaveBeenCalled();
      const call = insertAuditSpy.mock.calls[0][0];
      expect(call.action).toBe('COMMENT_ADDED');
      expect(call.actor).toBe('user-1');
      expect(call.resource).toBe('comment');
    });

    it('should handle audit insertion failures gracefully', async () => {
      jest.spyOn(databaseService, 'insertAudit').mockRejectedValueOnce(new Error('DB error'));

      // Should not throw despite audit failure
      const result = await service.addComment('post-1', 'user-1', 'text');
      expect(result).toHaveProperty('id');
    });
  });

  describe('getComments', () => {
    beforeEach(async () => {
      // Create sample comments
      await service.addComment('post-1', 'user-1', 'First comment');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.addComment('post-1', 'user-2', 'Second comment');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.addComment('post-1', 'user-3', 'Third comment');
      await service.addComment('post-2', 'user-1', 'Other post comment');
    });

    it('should retrieve comments with valid pagination', async () => {
      const result = await service.getComments('post-1', { page: 1, pageSize: 10 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('pageNumber');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('hasNextPage');
      expect(result).toHaveProperty('hasPreviousPage');
    });

    it('should return comments for specified post only', async () => {
      const result = await service.getComments('post-1', { page: 1, pageSize: 10 });

      expect(result.items.length).toBe(3);
      expect(result.totalCount).toBe(3);
      expect(result.items.every((c) => c.postId === 'post-1')).toBe(true);
    });

    it('should return empty list for post with no comments', async () => {
      const result = await service.getComments('post-999', { page: 1, pageSize: 10 });

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(1);
    });

    it('should sort comments chronologically (newest first)', async () => {
      const result = await service.getComments('post-1', { page: 1, pageSize: 10 });

      expect(result.items.length).toBe(3);
      expect(result.items[0].text).toBe('Third comment');
      expect(result.items[1].text).toBe('Second comment');
      expect(result.items[2].text).toBe('First comment');
    });

    it('should handle first page', async () => {
      const result = await service.getComments('post-1', { page: 1, pageSize: 2 });

      expect(result.pageNumber).toBe(1);
      expect(result.items.length).toBe(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should handle middle page', async () => {
      const result = await service.getComments('post-1', { page: 2, pageSize: 1 });

      expect(result.pageNumber).toBe(2);
      expect(result.items.length).toBe(1);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);
    });

    it('should handle last page', async () => {
      const result = await service.getComments('post-1', { page: 3, pageSize: 1 });

      expect(result.pageNumber).toBe(3);
      expect(result.items.length).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });

    it('should calculate correct totalPages', async () => {
      const result = await service.getComments('post-1', { page: 1, pageSize: 2 });

      expect(result.totalPages).toBe(2); // 3 comments / 2 per page = 1.5 -> 2 pages
    });

    it('should return totalPages as 1 for empty post', async () => {
      const result = await service.getComments('post-999', { page: 1, pageSize: 10 });

      expect(result.totalPages).toBe(1);
    });

    it('should throw BadRequestException if postId is missing', async () => {
      await expect(service.getComments('', { page: 1, pageSize: 10 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if page is less than 1', async () => {
      await expect(service.getComments('post-1', { page: 0, pageSize: 10 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if pageSize is 0', async () => {
      await expect(service.getComments('post-1', { page: 1, pageSize: 0 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if pageSize exceeds 100', async () => {
      await expect(service.getComments('post-1', { page: 1, pageSize: 101 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if pagination is null', async () => {
      await expect(service.getComments('post-1', null as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteComment', () => {
    let commentId: string;

    beforeEach(async () => {
      const comment = await service.addComment('post-1', 'user-1', 'Test comment');
      commentId = comment.id;
    });

    it('should delete comment when author requests', async () => {
      const result = await service.deleteComment(commentId, 'user-1', false);

      expect(result.deleted).toBe(true);
    });

    it('should delete comment when admin requests', async () => {
      const result = await service.deleteComment(commentId, 'user-2', true);

      expect(result.deleted).toBe(true);
    });

    it('should throw ForbiddenException if non-author, non-admin requests', async () => {
      await expect(service.deleteComment(commentId, 'user-2', false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if comment does not exist', async () => {
      await expect(service.deleteComment('cmt-nonexistent', 'user-1', false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should remove comment from storage after deletion', async () => {
      await service.deleteComment(commentId, 'user-1', false);

      const retrieved = await service.getCommentById(commentId);
      expect(retrieved).toBeUndefined();
    });

    it('should update comment count after deletion', async () => {
      const countBefore = await service.getCommentCount('post-1');
      await service.deleteComment(commentId, 'user-1', false);
      const countAfter = await service.getCommentCount('post-1');

      expect(countAfter).toBe(countBefore - 1);
    });

    it('should create audit entry on deletion', async () => {
      const insertAuditSpy = jest.spyOn(databaseService, 'insertAudit');
      await service.deleteComment(commentId, 'user-1', false);

      expect(insertAuditSpy).toHaveBeenCalled();
      const call = insertAuditSpy.mock.calls[0][0];
      expect(call.action).toBe('COMMENT_DELETED');
      expect(call.actor).toBe('user-1');
      expect(call.resource).toBe('comment');
    });

    it('should throw BadRequestException if commentId is missing', async () => {
      await expect(service.deleteComment('', 'user-1', false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if userId is missing', async () => {
      await expect(service.deleteComment(commentId, '', false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle audit insertion failures gracefully', async () => {
      jest.spyOn(databaseService, 'insertAudit').mockRejectedValueOnce(new Error('DB error'));

      // Should not throw despite audit failure
      const result = await service.deleteComment(commentId, 'user-1', false);
      expect(result.deleted).toBe(true);
    });

    it('should allow author to delete own comment case-sensitively', async () => {
      const result = await service.deleteComment(commentId, 'user-1', false);
      expect(result.deleted).toBe(true);
    });
  });

  describe('Authorization: Author vs Admin Deletion', () => {
    let comment1: Comment;
    let comment2: Comment;

    beforeEach(async () => {
      comment1 = await service.addComment('post-1', 'alice', 'Alice comment');
      comment2 = await service.addComment('post-1', 'bob', 'Bob comment');
    });

    it('should allow Alice to delete her own comment as non-admin', async () => {
      const result = await service.deleteComment(comment1.id, 'alice', false);
      expect(result.deleted).toBe(true);
    });

    it('should not allow Bob to delete Alice comment as non-admin', async () => {
      await expect(service.deleteComment(comment1.id, 'bob', false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow admin to delete any comment', async () => {
      const result1 = await service.deleteComment(comment1.id, 'admin-user', true);
      const result2 = await service.deleteComment(comment2.id, 'admin-user', true);

      expect(result1.deleted).toBe(true);
      expect(result2.deleted).toBe(true);
    });

    it('should allow admin to delete comment even if not author', async () => {
      const result = await service.deleteComment(comment1.id, 'some-admin', true);
      expect(result.deleted).toBe(true);
    });
  });

  describe('Pagination Edge Cases', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 5; i++) {
        await service.addComment('post-1', `user-${i}`, `Comment ${i}`);
      }
    });

    it('should handle pageSize of 1', async () => {
      const result = await service.getComments('post-1', { page: 1, pageSize: 1 });

      expect(result.items.length).toBe(1);
      expect(result.totalPages).toBe(5);
    });

    it('should handle pageSize of 100 with fewer items', async () => {
      const result = await service.getComments('post-1', { page: 1, pageSize: 100 });

      expect(result.items.length).toBe(5);
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
    });

    it('should return empty page beyond last page', async () => {
      const result = await service.getComments('post-1', { page: 100, pageSize: 10 });

      expect(result.items).toEqual([]);
      expect(result.pageNumber).toBe(100);
    });

    it('should calculate pagination correctly with 10 items and pageSize 3', async () => {
      for (let i = 6; i <= 10; i++) {
        await service.addComment('post-1', `user-${i}`, `Comment ${i}`);
      }

      const page1 = await service.getComments('post-1', { page: 1, pageSize: 3 });
      const page2 = await service.getComments('post-1', { page: 2, pageSize: 3 });
      const page3 = await service.getComments('post-1', { page: 3, pageSize: 3 });
      const page4 = await service.getComments('post-1', { page: 4, pageSize: 3 });

      expect(page1.items.length).toBe(3);
      expect(page2.items.length).toBe(3);
      expect(page3.items.length).toBe(3);
      expect(page4.items.length).toBe(1);
      expect(page1.totalPages).toBe(4);
    });
  });

  describe('Helper Methods', () => {
    beforeEach(async () => {
      await service.addComment('post-1', 'user-1', 'Comment 1');
      await service.addComment('post-1', 'user-2', 'Comment 2');
      await service.addComment('post-2', 'user-1', 'Comment 3');
    });

    it('should get comment by ID', async () => {
      const allComments = await service.getAllCommentsRaw('post-1');
      const comment = await service.getCommentById(allComments[0].id);

      expect(comment).toBeDefined();
      expect(comment?.text).toBe(allComments[0].text);
    });

    it('should return undefined for non-existent comment', async () => {
      const comment = await service.getCommentById('cmt-nonexistent');
      expect(comment).toBeUndefined();
    });

    it('should get all comments for post (raw)', async () => {
      const comments = await service.getAllCommentsRaw('post-1');

      expect(comments.length).toBe(2);
      expect(comments.every((c) => c.postId === 'post-1')).toBe(true);
    });

    it('should get comment count for post', async () => {
      const count = await service.getCommentCount('post-1');
      expect(count).toBe(2);
    });

    it('should return 0 count for non-existent post', async () => {
      const count = await service.getCommentCount('post-999');
      expect(count).toBe(0);
    });

    it('should return 0 count for null postId', async () => {
      const count = await service.getCommentCount(null as any);
      expect(count).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle multiple users commenting on same post', async () => {
      const c1 = await service.addComment('post-1', 'alice', 'Alice comment');
      const c2 = await service.addComment('post-1', 'bob', 'Bob comment');
      const c3 = await service.addComment('post-1', 'charlie', 'Charlie comment');

      const result = await service.getComments('post-1', { page: 1, pageSize: 10 });

      expect(result.items.length).toBe(3);
      expect(result.totalCount).toBe(3);
    });

    it('should handle multiple posts with separate comment threads', async () => {
      await service.addComment('post-1', 'user-1', 'Post 1 comment');
      await service.addComment('post-2', 'user-2', 'Post 2 comment');
      await service.addComment('post-3', 'user-3', 'Post 3 comment');

      const result1 = await service.getComments('post-1', { page: 1, pageSize: 10 });
      const result2 = await service.getComments('post-2', { page: 1, pageSize: 10 });
      const result3 = await service.getComments('post-3', { page: 1, pageSize: 10 });

      expect(result1.items.length).toBe(1);
      expect(result2.items.length).toBe(1);
      expect(result3.items.length).toBe(1);
    });

    it('should handle add-delete-add cycle', async () => {
      const c1 = await service.addComment('post-1', 'user-1', 'Comment 1');
      await service.deleteComment(c1.id, 'user-1', false);
      const c2 = await service.addComment('post-1', 'user-1', 'Comment 2');

      const result = await service.getComments('post-1', { page: 1, pageSize: 10 });

      expect(result.items.length).toBe(1);
      expect(result.items[0].id).toBe(c2.id);
    });

    it('should handle rapid comment creation', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.addComment('post-1', 'user-1', `Comment ${i + 1}`),
      );

      await Promise.all(promises);

      const result = await service.getComments('post-1', { page: 1, pageSize: 20 });
      expect(result.items.length).toBe(10);
      expect(result.totalCount).toBe(10);
    });
  });
});
