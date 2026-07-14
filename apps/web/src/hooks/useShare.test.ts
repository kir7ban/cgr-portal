import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShare } from './useShare';

/**
 * TEST SUITE: Issue #17 - Sharing - Forward Posts Internally
 * Tests verify:
 * - Sharing posts with user/group selector
 * - Success toast showing recipient count
 * - Share flow with recipient list
 */

describe('useShare - Issue #17', () => {
  const mockPostId = 'post-1';
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('sharePost', () => {
    it('should share a post with a list of recipients', async () => {
      const recipients = ['user-1', 'user-2', 'user-3'];
      const mockResponse = {
        sharedWith: 3,
        message: 'Post shared successfully',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useShare(mockPostId, mockUserId));

      let shareResult;
      await act(async () => {
        shareResult = await result.current.sharePost(recipients);
      });

      expect(shareResult).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${mockPostId}/share`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ recipients }),
        })
      );
    });

    it('should return recipient count for toast notification', async () => {
      const recipients = ['user-1', 'user-2'];
      const mockResponse = {
        sharedWith: 2,
        message: 'Post shared successfully',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useShare(mockPostId, mockUserId));

      let shareResult;
      await act(async () => {
        shareResult = await result.current.sharePost(recipients);
      });

      expect(shareResult.sharedWith).toBe(2);
    });

    it('should handle empty recipient list', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'At least one recipient required' } }),
      });

      const { result } = renderHook(() => useShare(mockPostId, mockUserId));

      await act(async () => {
        try {
          await result.current.sharePost([]);
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('At least one recipient required');
        }
      });
    });

    it('should handle share error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Failed to share post' } }),
      });

      const { result } = renderHook(() => useShare(mockPostId, mockUserId));

      await act(async () => {
        try {
          await result.current.sharePost(['user-1']);
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Failed to share post');
        }
      });
    });

    it('should share with a single recipient', async () => {
      const recipients = ['user-1'];
      const mockResponse = {
        sharedWith: 1,
        message: 'Post shared successfully',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useShare(mockPostId, mockUserId));

      let shareResult;
      await act(async () => {
        shareResult = await result.current.sharePost(recipients);
      });

      expect(shareResult.sharedWith).toBe(1);
    });

    it('should share with multiple recipients', async () => {
      const recipients = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
      const mockResponse = {
        sharedWith: 5,
        message: 'Post shared successfully',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useShare(mockPostId, mockUserId));

      let shareResult;
      await act(async () => {
        shareResult = await result.current.sharePost(recipients);
      });

      expect(shareResult.sharedWith).toBe(5);
    });
  });

  describe('getUsers', () => {
    it('should fetch available users for selection', async () => {
      const mockUsers = [
        { id: 'user-1', username: 'alice', email: 'alice@bosch.com' },
        { id: 'user-2', username: 'bob', email: 'bob@bosch.com' },
        { id: 'user-3', username: 'charlie', email: 'charlie@bosch.com' },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      });

      const { result } = renderHook(() => useShare(mockPostId, mockUserId));

      let users;
      await act(async () => {
        users = await result.current.getUsers();
      });

      expect(users).toEqual(mockUsers);
      expect(global.fetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
        method: 'GET',
      }));
    });

    it('should handle error fetching users', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Failed to fetch users' } }),
      });

      const { result } = renderHook(() => useShare(mockPostId, mockUserId));

      await act(async () => {
        try {
          await result.current.getUsers();
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Failed to fetch users');
        }
      });
    });
  });

  describe('getGroups', () => {
    it('should fetch available groups for selection', async () => {
      const mockGroups = [
        { id: 'group-1', name: 'Engineering', memberCount: 45 },
        { id: 'group-2', name: 'Marketing', memberCount: 20 },
        { id: 'group-3', name: 'Sales', memberCount: 30 },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockGroups,
      });

      const { result } = renderHook(() => useShare(mockPostId, mockUserId));

      let groups;
      await act(async () => {
        groups = await result.current.getGroups();
      });

      expect(groups).toEqual(mockGroups);
      expect(global.fetch).toHaveBeenCalledWith('/api/groups', expect.objectContaining({
        method: 'GET',
      }));
    });

    it('should handle error fetching groups', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Failed to fetch groups' } }),
      });

      const { result } = renderHook(() => useShare(mockPostId, mockUserId));

      await act(async () => {
        try {
          await result.current.getGroups();
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Failed to fetch groups');
        }
      });
    });
  });
});
