/**
 * useOfflineCache Hook
 * Issue #20: React hook for offline caching
 *
 * Usage:
 * ```
 * const { isOnline, syncStatus, pendingCount } = useOfflineCache();
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import { CacheService } from '@/services/cache';

export interface UseOfflineCacheResult {
  isOnline: boolean;
  isOffline: boolean;
  syncStatus: 'pending' | 'syncing' | 'completed' | 'error' | null;
  pendingCount: number;
  isSyncing: boolean;
  sync: () => Promise<void>;
  clearCache: () => Promise<void>;
}

/**
 * Hook for offline cache functionality
 */
export function useOfflineCache(): UseOfflineCacheResult {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'pending' | 'syncing' | 'completed' | 'error' | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize listeners
  useEffect(() => {
    // Listen for network status
    const unsubscribeNetwork = CacheService.onNetworkStatus((status) => {
      if (status === 'online') {
        setIsOnline(true);
      } else if (status === 'offline') {
        setIsOnline(false);
      }
    });

    // Listen for sync status
    const unsubscribeSync = CacheService.onSyncStatus((status, details) => {
      setSyncStatus(status);

      if (status === 'syncing') {
        setIsSyncing(true);
      } else if (status === 'completed' || status === 'error') {
        setIsSyncing(false);
      }

      if (status === 'pending' && details?.count) {
        setPendingCount(details.count);
      }
    });

    // Get initial pending count
    CacheService.getPendingCount().then(setPendingCount);

    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
    };
  }, []);

  const sync = useCallback(async () => {
    await CacheService.sync();
  }, []);

  const clearCache = useCallback(async () => {
    await CacheService.clearCache();
    setPendingCount(0);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    syncStatus,
    pendingCount,
    isSyncing,
    sync,
    clearCache,
  };
}

export default useOfflineCache;
