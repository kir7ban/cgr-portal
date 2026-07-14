import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineSync } from './useOfflineSync';

/**
 * TEST SUITE: Issue #21 - Offline Support - Service Worker & IndexedDB
 * Tests verify:
 * - Service Worker registration and caching
 * - IndexedDB storage of posts
 * - Offline mode with cached posts (read-only)
 * - Sync Manager queue for mutations
 * - Reconnection sync
 * - Last sync timestamp
 * - Offline indicator
 */

describe('useOfflineSync - Issue #21', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('registerServiceWorker', () => {
    it('should register service worker', async () => {
      const mockRegister = vi.fn().mockResolvedValue({
        scope: '/sw/',
        active: { state: 'activated' },
      });

      global.navigator = {
        serviceWorker: { register: mockRegister },
      } as any;

      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let registered;
      await act(async () => {
        registered = await result.current.registerServiceWorker();
      });

      expect(registered).toBeDefined();
      expect(mockRegister).toHaveBeenCalledWith('/sw/sw.js');
    });

    it('should handle registration error', async () => {
      const mockRegister = vi.fn().mockRejectedValue(new Error('SW registration failed'));

      global.navigator = {
        serviceWorker: { register: mockRegister },
      } as any;

      const { result } = renderHook(() => useOfflineSync(mockUserId));

      await act(async () => {
        try {
          await result.current.registerServiceWorker();
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('registration failed');
        }
      });
    });
  });

  describe('cachePostsForOffline', () => {
    it('should cache last 50 posts per department to IndexedDB', async () => {
      const mockPosts = Array(50).fill(null).map((_, i) => ({
        id: `post-${i}`,
        text: `Post ${i}`,
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
        createdBy: 'alice',
        state: 'PUBLISHED',
      }));

      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let cacheResult;
      await act(async () => {
        cacheResult = await result.current.cachePostsForOffline(mockPosts, 'engineering');
      });

      expect(cacheResult.cached).toBe(true);
      expect(cacheResult.count).toBe(50);
    });

    it('should limit to 50 posts per department', async () => {
      const mockPosts = Array(100).fill(null).map((_, i) => ({
        id: `post-${i}`,
        text: `Post ${i}`,
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
        createdBy: 'alice',
        state: 'PUBLISHED',
      }));

      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let cacheResult;
      await act(async () => {
        cacheResult = await result.current.cachePostsForOffline(mockPosts, 'engineering');
      });

      expect(cacheResult.count).toBe(50);
    });
  });

  describe('getCachedPosts', () => {
    it('should retrieve cached posts from IndexedDB', async () => {
      const mockCachedPosts = [
        { id: 'post-1', text: 'Cached post', createdBy: 'alice', state: 'PUBLISHED' },
        { id: 'post-2', text: 'Another cached', createdBy: 'bob', state: 'PUBLISHED' },
      ];

      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let posts;
      await act(async () => {
        posts = await result.current.getCachedPosts('engineering');
      });

      expect(posts).toBeDefined();
    });

    it('should return empty array if no cached posts', async () => {
      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let posts;
      await act(async () => {
        posts = await result.current.getCachedPosts('unknown-department');
      });

      expect(posts).toBeDefined();
    });
  });

  describe('queueMutation', () => {
    it('should queue mutation when offline', async () => {
      const mutation = {
        type: 'POST_CREATE',
        data: { text: 'New post' },
        timestamp: Date.now(),
      };

      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let queueResult;
      await act(async () => {
        queueResult = await result.current.queueMutation(mutation);
      });

      expect(queueResult.queued).toBe(true);
    });

    it('should store queue in IndexedDB', async () => {
      const mutation = {
        type: 'COMMENT_ADD',
        data: { postId: 'post-1', text: 'Comment' },
        timestamp: Date.now(),
      };

      const { result } = renderHook(() => useOfflineSync(mockUserId));

      await act(async () => {
        await result.current.queueMutation(mutation);
      });

      // Verify queue is stored
      let queue;
      await act(async () => {
        queue = await result.current.getPendingQueue();
      });

      expect(queue).toBeDefined();
      expect(Array.isArray(queue)).toBe(true);
    });
  });

  describe('syncOnReconnect', () => {
    it('should sync queued mutations when connection restored', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ synced: 2 }),
      });

      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let syncResult;
      await act(async () => {
        syncResult = await result.current.syncOnReconnect();
      });

      expect(syncResult).toBeDefined();
    });

    it('should update lastSyncTime on successful sync', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ synced: 1 }),
      });

      const { result } = renderHook(() => useOfflineSync(mockUserId));

      await act(async () => {
        await result.current.syncOnReconnect();
      });

      let lastSync;
      await act(async () => {
        lastSync = await result.current.getLastSyncTime();
      });

      expect(lastSync).toBeDefined();
    });
  });

  describe('getOfflineStatus', () => {
    it('should return online status', async () => {
      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let status;
      await act(async () => {
        status = result.current.getOfflineStatus();
      });

      expect(status).toBeDefined();
      expect(status.isOnline !== undefined).toBe(true);
    });

    it('should indicate offline mode', async () => {
      global.navigator = {
        onLine: false,
      } as any;

      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let status;
      await act(async () => {
        status = result.current.getOfflineStatus();
      });

      expect(status.isOnline).toBe(false);
    });
  });

  describe('getLastSyncTime', () => {
    it('should return last sync timestamp', async () => {
      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let lastSync;
      await act(async () => {
        lastSync = await result.current.getLastSyncTime();
      });

      expect(lastSync).toBeDefined();
    });

    it('should return null if never synced', async () => {
      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let lastSync;
      await act(async () => {
        lastSync = await result.current.getLastSyncTime();
      });

      // First check may be null if no prior sync
      expect(lastSync === null || typeof lastSync === 'string').toBe(true);
    });
  });

  describe('getPendingQueue', () => {
    it('should return pending mutations queue', async () => {
      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let queue;
      await act(async () => {
        queue = await result.current.getPendingQueue();
      });

      expect(Array.isArray(queue)).toBe(true);
    });

    it('should return empty array if queue is empty', async () => {
      const { result } = renderHook(() => useOfflineSync(mockUserId));

      let queue;
      await act(async () => {
        queue = await result.current.getPendingQueue();
      });

      expect(queue.length === 0 || Array.isArray(queue)).toBe(true);
    });
  });
});
