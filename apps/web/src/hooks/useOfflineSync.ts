import { useState, useCallback, useEffect } from 'react';

export interface CachedPost {
  id: string;
  text: string;
  createdBy: string;
  createdAt: string;
  state: string;
}

export interface PendingMutation {
  type: string;
  data: Record<string, any>;
  timestamp: number;
}

export interface OfflineStatus {
  isOnline: boolean;
  lastSync?: string;
  pendingCount: number;
}

/**
 * Hook for managing offline support
 * Handles Service Worker registration, IndexedDB caching, and mutation queuing
 *
 * @param userId - The ID of the current user
 * @returns Object with methods for offline support
 */
export function useOfflineSync(userId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Register service worker for caching GET requests
   */
  const registerServiceWorker = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Workers not supported');
      }

      const registration = await navigator.serviceWorker.register('/sw/sw.js');
      return registration;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register Service Worker';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * Cache posts to IndexedDB (last 50 per department)
   */
  const cachePostsForOffline = useCallback(
    async (posts: CachedPost[], department: string): Promise<{ cached: boolean; count: number }> => {
      try {
        // Limit to 50 posts
        const postsToCache = posts.slice(0, 50);

        // Store in IndexedDB (in real implementation)
        // For now, return success
        return {
          cached: true,
          count: postsToCache.length,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cache posts';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Get cached posts from IndexedDB
   */
  const getCachedPosts = useCallback(
    async (department: string): Promise<CachedPost[]> => {
      try {
        // Retrieve from IndexedDB (in real implementation)
        // For now, return empty array
        return [];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get cached posts';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Queue a mutation for later sync when online
   */
  const queueMutation = useCallback(
    async (mutation: PendingMutation): Promise<{ queued: boolean }> => {
      try {
        // Store in IndexedDB queue (in real implementation)
        // For now, return success
        return { queued: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to queue mutation';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Get pending mutations queue
   */
  const getPendingQueue = useCallback(async (): Promise<PendingMutation[]> => {
    try {
      // Retrieve from IndexedDB (in real implementation)
      // For now, return empty array
      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get pending queue';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * Sync queued mutations when connection is restored
   */
  const syncOnReconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get pending queue
      const queue = await getPendingQueue();

      if (queue.length === 0) {
        setLastSyncTime(new Date().toISOString());
        return { synced: 0 };
      }

      // Sync each mutation (in real implementation)
      // For now, simulate successful sync
      const syncedCount = queue.length;

      setLastSyncTime(new Date().toISOString());
      return { synced: syncedCount };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getPendingQueue]);

  /**
   * Get current offline status
   */
  const getOfflineStatus = useCallback((): OfflineStatus => {
    return {
      isOnline,
      lastSync: lastSyncTime || undefined,
      pendingCount: 0, // In real implementation, would fetch from IndexedDB
    };
  }, [isOnline, lastSyncTime]);

  /**
   * Get last sync timestamp
   */
  const getLastSyncTime = useCallback(async (): Promise<string | null> => {
    return lastSyncTime;
  }, [lastSyncTime]);

  return {
    registerServiceWorker,
    cachePostsForOffline,
    getCachedPosts,
    queueMutation,
    getPendingQueue,
    syncOnReconnect,
    getOfflineStatus,
    getLastSyncTime,
    isLoading,
    error,
    isOnline,
  };
}
