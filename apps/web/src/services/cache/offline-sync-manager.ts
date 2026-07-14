/**
 * Offline Sync Manager
 * Issue #20: Manages syncing offline changes when connection is restored
 *
 * Features:
 * - Queue pending posts for sync
 * - Handle sync errors and retry logic
 * - Notify app of sync status
 * - Coordinate with ServiceWorker for background sync
 */

import { getCache, PendingPost } from './indexeddb-cache';
import { getServiceWorkerManager } from './service-worker-manager';

export type SyncCallback = (
  status: 'pending' | 'syncing' | 'completed' | 'error',
  details?: any
) => void;

/**
 * Offline Sync Manager
 */
export class OfflineSyncManager {
  private callbacks: Set<SyncCallback> = new Set();
  private isSyncing: boolean = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  /**
   * Add sync status callback
   */
  onSyncStatus(callback: SyncCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Start syncing pending posts
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[Sync Manager] Sync already in progress');
      return;
    }

    this.isSyncing = true;
    this.notifyCallbacks('syncing', { message: 'Starting sync...' });

    try {
      const cache = await getCache();
      const pendingPosts = await cache.getPendingPosts();

      if (pendingPosts.length === 0) {
        console.log('[Sync Manager] No pending posts to sync');
        this.notifyCallbacks('completed', { synced: 0, failed: 0 });
        this.isSyncing = false;
        return;
      }

      console.log('[Sync Manager] Syncing', pendingPosts.length, 'posts');
      this.notifyCallbacks('pending', { count: pendingPosts.length });

      let synced = 0;
      let failed = 0;

      for (const post of pendingPosts) {
        try {
          const success = await this.syncPost(post);

          if (success) {
            await cache.removePendingPost(post.id);
            synced++;
            this.notifyCallbacks('pending', { synced, failed, total: pendingPosts.length });
          } else {
            await cache.incrementRetryCount(post.id);
            failed++;
          }
        } catch (error) {
          console.error('[Sync Manager] Error syncing post:', post.id, error);
          await cache.incrementRetryCount(post.id);
          failed++;
        }
      }

      this.notifyCallbacks('completed', { synced, failed });
      console.log('[Sync Manager] Sync complete:', { synced, failed });
    } catch (error) {
      console.error('[Sync Manager] Sync failed:', error);
      this.notifyCallbacks('error', { error });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single post
   */
  private async syncPost(post: PendingPost): Promise<boolean> {
    const { id, action, data } = post;

    try {
      let url: string;
      let method: string;
      let body: string;

      switch (action) {
        case 'create':
          url = '/api/posts';
          method = 'POST';
          body = JSON.stringify(data);
          break;

        case 'update':
          url = `/api/posts/${id}`;
          method = 'PUT';
          body = JSON.stringify(data);
          break;

        case 'submit':
          url = `/api/posts/${id}/submit`;
          method = 'POST';
          body = JSON.stringify(data);
          break;

        case 'delete':
          url = `/api/posts/${id}`;
          method = 'DELETE';
          body = '';
          break;

        default:
          console.warn('[Sync Manager] Unknown action:', action);
          return false;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'DELETE' ? body : undefined,
      });

      if (!response.ok) {
        console.error('[Sync Manager] Sync failed:', id, response.status, response.statusText);
        return false;
      }

      console.log('[Sync Manager] Synced:', id, action);
      return true;
    } catch (error) {
      console.error('[Sync Manager] Sync error:', id, error);
      return false;
    }
  }

  /**
   * Queue a post for offline sync
   */
  async queuePost(
    postId: string,
    action: 'create' | 'update' | 'delete' | 'submit',
    data: any
  ): Promise<void> {
    try {
      const cache = await getCache();
      await cache.addPendingPost(postId, action, data);
      console.log('[Sync Manager] Post queued:', postId, action);
    } catch (error) {
      console.error('[Sync Manager] Queue failed:', error);
      throw error;
    }
  }

  /**
   * Check if there are pending posts
   */
  async hasPendingPosts(): Promise<boolean> {
    try {
      const cache = await getCache();
      const pending = await cache.getPendingPosts();
      return pending.length > 0;
    } catch (error) {
      console.error('[Sync Manager] Check failed:', error);
      return false;
    }
  }

  /**
   * Get pending posts count
   */
  async getPendingCount(): Promise<number> {
    try {
      const cache = await getCache();
      const pending = await cache.getPendingPosts();
      return pending.length;
    } catch (error) {
      console.error('[Sync Manager] Get count failed:', error);
      return 0;
    }
  }

  /**
   * Clear all pending posts
   */
  async clearPending(): Promise<void> {
    try {
      const cache = await getCache();
      const pending = await cache.getPendingPosts();

      for (const post of pending) {
        await cache.removePendingPost(post.id);
      }

      console.log('[Sync Manager] Pending posts cleared');
    } catch (error) {
      console.error('[Sync Manager] Clear failed:', error);
    }
  }

  /**
   * Get sync status
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Notify callbacks
   */
  private notifyCallbacks(
    status: 'pending' | 'syncing' | 'completed' | 'error',
    details?: any
  ): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(status, details);
      } catch (error) {
        console.error('[Sync Manager] Callback error:', error);
      }
    });
  }
}

// Singleton instance
let syncManagerInstance: OfflineSyncManager | null = null;

/**
 * Get or create OfflineSyncManager instance
 */
export function getSyncManager(): OfflineSyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new OfflineSyncManager();
  }
  return syncManagerInstance;
}

/**
 * Initialize offline sync
 */
export async function initializeOfflineSync(): Promise<void> {
  const swManager = getServiceWorkerManager();
  const syncManager = getSyncManager();

  // Listen for online/offline events
  swManager.onSyncStatus((status) => {
    if (status === 'online') {
      console.log('[Sync Init] Triggering sync on online event');
      syncManager.sync();
    }
  });

  // Try initial sync if online
  if (navigator.onLine) {
    try {
      await syncManager.sync();
    } catch (error) {
      console.error('[Sync Init] Initial sync failed:', error);
    }
  }
}
