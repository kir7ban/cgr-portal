import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComments } from './useComments';

/**
 * TEST SUITE: Issue #16 - Comments - Add, View, Delete
 * Tests verify:
 * - Adding comments to posts
 * - Fetching comments with pagination
 * - Deleting comments (own or admin)
 * - Chronological ordering (oldest first)
 */

describe('useComments - Issue #16', () => {
  const mockPostId = 'post-1';
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('addComment', () => {
    it('should add a text comment to a post', async () => {
      const mockComment = {
        id: 'comment-1',
        postId: mockPostId,
        userId: mockUserId,
        text: 'Great post!',
        createdAt: '2026-07-14T10:00:00Z',
        createdBy: 'alice',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockComment,
      });

      const { result } = renderHook(() => useComments(mockPostId, mockUserId));

      let addedComment;
      await act(async () => {
        addedComment = await result.current.addComment('Great post!');
      });

      expect(addedComment).toEqual(mockComment);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${mockPostId}/comments`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ text: 'Great post!' }),
        })
      );
    });

    it('should handle comment add error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Comment text required' } }),
      });

      const { result } = renderHook(() => useComments(mockPostId, mockUserId));

      await act(async () => {
        try {
          await result.current.addComment('');
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Comment text required');
        }
      });
    });
  });

  describe('getComments', () => {
    it('should fetch comments with pagination (5 per page)', async () => {
      const mockComments = [
        { id: 'c1', postId: mockPostId, text: 'First', createdBy: 'alice', createdAt: '2026-07-14T09:00:00Z' },
        { id: 'c2', postId: mockPostId, text: 'Second', createdBy: 'bob', createdAt: '2026-07-14T10:00:00Z' },
        { id: 'c3', postId: mockPostId, text: 'Third', createdBy: 'alice', createdAt: '2026-07-14T11:00:00Z' },
      ];

      const mockResponse = {
        items: mockComments,
        totalCount: 3,
        pageNumber: 1,
        pageSize: 5,
        totalPages: 1,
        hasNextPage: false,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useComments(mockPostId, mockUserId));

      let comments;
      await act(async () => {
        const response = await result.current.getComments(1);
        comments = response.items;
      });

      expect(comments).toEqual(mockComments);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${mockPostId}/comments?page=1&pageSize=5`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should return pagination metadata', async () => {
      const mockResponse = {
        items: Array(5).fill(null).map((_, i) => ({
          id: `c${i}`,
          postId: mockPostId,
          text: `Comment ${i}`,
          createdBy: 'alice',
          createdAt: '2026-07-14T10:00:00Z',
        })),
        totalCount: 12,
        pageNumber: 1,
        pageSize: 5,
        totalPages: 3,
        hasNextPage: true,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useComments(mockPostId, mockUserId));

      let response;
      await act(async () => {
        response = await result.current.getComments(1);
      });

      expect(response.totalCount).toBe(12);
      expect(response.totalPages).toBe(3);
      expect(response.hasNextPage).toBe(true);
      expect(response.items).toHaveLength(5);
    });

    it('should display comments chronologically (oldest first)', async () => {
      const mockComments = [
        { id: 'c1', postId: mockPostId, text: 'First', createdBy: 'alice', createdAt: '2026-07-14T08:00:00Z' },
        { id: 'c2', postId: mockPostId, text: 'Second', createdBy: 'bob', createdAt: '2026-07-14T09:00:00Z' },
        { id: 'c3', postId: mockPostId, text: 'Third', createdBy: 'alice', createdAt: '2026-07-14T10:00:00Z' },
      ];

      const mockResponse = {
        items: mockComments,
        totalCount: 3,
        pageNumber: 1,
        pageSize: 5,
        totalPages: 1,
        hasNextPage: false,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useComments(mockPostId, mockUserId));

      let comments;
      await act(async () => {
        const response = await result.current.getComments(1);
        comments = response.items;
      });

      expect(comments[0].createdAt).toBe('2026-07-14T08:00:00Z');
      expect(comments[1].createdAt).toBe('2026-07-14T09:00:00Z');
      expect(comments[2].createdAt).toBe('2026-07-14T10:00:00Z');
    });

    it('should handle fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } }),
      });

      const { result } = renderHook(() => useComments(mockPostId, mockUserId));

      await act(async () => {
        try {
          await result.current.getComments(1);
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Server error');
        }
      });
    });
  });

  describe('deleteComment', () => {
    it('should delete own comment', async () => {
      const commentId = 'comment-1';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true }),
      });

      const { result } = renderHook(() => useComments(mockPostId, mockUserId));

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteComment(commentId);
      });

      expect(deleteResult).toEqual({ deleted: true });
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${mockPostId}/comments/${commentId}`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle unauthorized deletion', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'Cannot delete other users comments' } }),
      });

      const { result } = renderHook(() => useComments(mockPostId, mockUserId));

      await act(async () => {
        try {
          await result.current.deleteComment('comment-from-other-user');
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Cannot delete other users comments');
        }
      });
    });

    it('should handle comment not found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Comment not found' } }),
      });

      const { result } = renderHook(() => useComments(mockPostId, mockUserId));

      await act(async () => {
        try {
          await result.current.deleteComment('non-existent');
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Comment not found');
        }
      });
    });
  });
});
