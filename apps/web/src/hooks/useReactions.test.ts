import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReactions } from './useReactions';

/**
 * TEST SUITE: Issue #15 - Reactions - Add & Remove Emoji
 * Tests verify:
 * - Adding reactions to posts
 * - Removing reactions from posts
 * - Retrieving aggregated reaction counts
 * - Displaying userReacted flag for current user
 */

describe('useReactions - Issue #15', () => {
  const mockPostId = 'post-1';
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('addReaction', () => {
    it('should add a reaction emoji to a post', async () => {
      const mockReaction = {
        id: 'react-1',
        postId: mockPostId,
        userId: mockUserId,
        emoji: '👍',
        createdAt: '2026-07-14T10:00:00Z',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockReaction,
      });

      const { result } = renderHook(() => useReactions(mockPostId, mockUserId));

      let addedReaction;
      await act(async () => {
        addedReaction = await result.current.addReaction('👍');
      });

      expect(addedReaction).toEqual(mockReaction);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${mockPostId}/reactions`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ emoji: '👍', userId: mockUserId }),
        })
      );
    });

    it('should handle reaction add error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid emoji' } }),
      });

      const { result } = renderHook(() => useReactions(mockPostId, mockUserId));

      await act(async () => {
        try {
          await result.current.addReaction('invalid');
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Invalid emoji');
        }
      });
    });

    it('should add multiple different emoji reactions', async () => {
      const mockReactions = [
        { id: 'react-1', postId: mockPostId, userId: mockUserId, emoji: '👍', createdAt: '2026-07-14T10:00:00Z' },
        { id: 'react-2', postId: mockPostId, userId: mockUserId, emoji: '❤️', createdAt: '2026-07-14T10:01:00Z' },
      ];

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => mockReactions[0] })
        .mockResolvedValueOnce({ ok: true, json: async () => mockReactions[1] });

      const { result } = renderHook(() => useReactions(mockPostId, mockUserId));

      await act(async () => {
        await result.current.addReaction('👍');
        await result.current.addReaction('❤️');
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction from a post', async () => {
      const reactionId = 'react-1';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true }),
      });

      const { result } = renderHook(() => useReactions(mockPostId, mockUserId));

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.removeReaction(reactionId);
      });

      expect(deleteResult).toEqual({ deleted: true });
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${mockPostId}/reactions/${reactionId}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle reaction removal error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Reaction not found' } }),
      });

      const { result } = renderHook(() => useReactions(mockPostId, mockUserId));

      await act(async () => {
        try {
          await result.current.removeReaction('non-existent');
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Reaction not found');
        }
      });
    });

    it('should only allow removing own reactions', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Can only remove your own reactions' } }),
      });

      const { result } = renderHook(() => useReactions(mockPostId, 'different-user'));

      await act(async () => {
        try {
          await result.current.removeReaction('react-1');
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain("Can only remove your own reactions");
        }
      });
    });
  });

  describe('getReactions', () => {
    it('should fetch aggregated reactions for a post', async () => {
      const mockReactionCounts = [
        { emoji: '👍', count: 3, userReacted: true },
        { emoji: '❤️', count: 2, userReacted: false },
        { emoji: '😂', count: 1, userReacted: false },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockReactionCounts,
      });

      const { result } = renderHook(() => useReactions(mockPostId, mockUserId));

      let reactions;
      await act(async () => {
        reactions = await result.current.getReactions();
      });

      expect(reactions).toEqual(mockReactionCounts);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${mockPostId}/reactions?userId=${mockUserId}`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should show emoji + count format', async () => {
      const mockReactionCounts = [
        { emoji: '👍', count: 5, userReacted: true },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockReactionCounts,
      });

      const { result } = renderHook(() => useReactions(mockPostId, mockUserId));

      let reactions;
      await act(async () => {
        reactions = await result.current.getReactions();
      });

      expect(reactions[0]).toEqual(expect.objectContaining({
        emoji: '👍',
        count: 5,
        userReacted: true,
      }));
    });

    it('should indicate whether current user has reacted', async () => {
      const mockReactionCounts = [
        { emoji: '👍', count: 3, userReacted: true },
        { emoji: '❤️', count: 2, userReacted: false },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockReactionCounts,
      });

      const { result } = renderHook(() => useReactions(mockPostId, mockUserId));

      let reactions;
      await act(async () => {
        reactions = await result.current.getReactions();
      });

      expect(reactions[0].userReacted).toBe(true);
      expect(reactions[1].userReacted).toBe(false);
    });

    it('should handle empty reactions', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { result } = renderHook(() => useReactions(mockPostId, mockUserId));

      let reactions;
      await act(async () => {
        reactions = await result.current.getReactions();
      });

      expect(reactions).toEqual([]);
    });

    it('should handle fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } }),
      });

      const { result } = renderHook(() => useReactions(mockPostId, mockUserId));

      await act(async () => {
        try {
          await result.current.getReactions();
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Server error');
        }
      });
    });
  });
});
