/**
 * Cache Service
 * Issue #20: High-level API for offline caching
 *
 * Integrates:
 * - IndexedDB cache
 * - ServiceWorker management
 * - Offline sync
 */

import { getCache, CachedPost, CachedFeed } from './indexeddb-cache';
import { getServiceWorkerManager, initializeServiceWorker } from './service-worker-manager';
import { getSyncManager, initializeOfflineSync } from './offline-sync-manager';

/**
 * Cache Service
 */
export class CacheService {
  /**
   * Initialize cache system (call once on app startup)
   */
  static async initialize(): Promise<void> {
    console.log('[Cache Service] Initializing...');

    try {
      // Initialize IndexedDB
      await getCache();
      console.log('[Cache Service] IndexedDB ready');

      // Register ServiceWorker
      await initializeServiceWorker();
      console.log('[Cache Service] ServiceWorker registered');

      // Initialize offline sync
      await initializeOfflineSync();
      console.log('[Cache Service] Offline sync initialized');
    } catch (error) {
      console.error('[Cache Service] Initialization failed:', error);
      // Don't throw - app should work without caching
    }
  }

  /**
   * Cache a single post
   */
  static async cachePost(post: CachedPost, dept?: string): Promise<void> {
    const cache = await getCache();
    await cache.cachePost(post, dept);
  }

  /**
   * Cache multiple posts
   */
  static async cachePosts(posts: CachedPost[], dept?: string): Promise<void> {
    const cache = await getCache();
    await cache.cachePosts(posts, dept);
  }

  /**
   * Get cached post
   */
  static async getPost(postId: string): Promise<CachedPost | undefined> {
    const cache = await getCache();
    return cache.getPost(postId);
  }

  /**
   * Get all posts from a department
   */
  static async getPostsByDept(dept: string): Promise<CachedPost[]> {
    const cache = await getCache();
    return cache.getPostsByDept(dept);
  }

  /**
   * Cache feed response
   */
  static async cacheFeed(feed: CachedFeed): Promise<void> {
    const cache = await getCache();
    await cache.cacheFeed(feed);
  }

  /**
   * Get cached feed
   */
  static async getFeed(cacheKey: string): Promise<CachedFeed | undefined> {
    const cache = await getCache();
    return cache.getFeed(cacheKey);
  }

  /**
   * Generate cache key for feed
   */
  static generateFeedCacheKey(userId: string, audiences: string[], page: number, pageSize: number): string {
    return `feed:${userId}:${audiences.join(',')}:${page}:${pageSize}`;
  }

  /**
   * Queue a post for offline sync
   */
  static async queuePostSync(
    postId: string,
    action: 'create' | 'update' | 'delete' | 'submit',
    data: any
  ): Promise<void> {
    const syncManager = getSyncManager();
    await syncManager.queuePost(postId, action, data);
  }

  /**
   * Start syncing pending posts
   */
  static async sync(): Promise<void> {
    const syncManager = getSyncManager();
    await syncManager.sync();
  }

  /**
   * Check for pending posts
   */
  static async hasPendingPosts(): Promise<boolean> {
    const syncManager = getSyncManager();
    return syncManager.hasPendingPosts();
  }

  /**
   * Get pending posts count
   */
  static async getPendingCount(): Promise<number> {
    const syncManager = getSyncManager();
    return syncManager.getPendingCount();
  }

  /**
   * Listen for sync status changes
   */
  static onSyncStatus(callback: (status: 'pending' | 'syncing' | 'completed' | 'error', details?: any) => void): () => void {
    const syncManager = getSyncManager();
    return syncManager.onSyncStatus(callback);
  }

  /**
   * Listen for online/offline status
   */
  static onNetworkStatus(callback: (status: 'online' | 'offline' | 'synced') => void): () => void {
    const swManager = getServiceWorkerManager();
    return swManager.onSyncStatus(callback);
  }

  /**
   * Get online status
   */
  static isOnline(): boolean {
    const swManager = getServiceWorkerManager();
    return swManager.getOnlineStatus();
  }

  /**
   * Manually trigger sync
   */
  static async triggerSync(): Promise<void> {
    const swManager = getServiceWorkerManager();
    await swManager.triggerSync();
  }

  /**
   * Clear all cache
   */
  static async clearCache(): Promise<void> {
    const cache = await getCache();
    await cache.clear();

    const swManager = getServiceWorkerManager();
    await swManager.clearCaches();

    console.log('[Cache Service] All caches cleared');
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    totalPosts: number;
    totalPendingPosts: number;
    totalFeedsCache: number;
  }> {
    const cache = await getCache();
    return cache.getStats();
  }

  /**
   * Check if offline
   */
  static isOffline(): boolean {
    return !navigator.onLine;
  }
}

export default CacheService;
