/**
 * IndexedDB Cache Manager
 * Issue #20: Offline caching with IndexedDB
 *
 * Manages:
 * - Post caching (50 posts/dept max)
 * - Feed data caching
 * - Pending offline changes
 * - LRU eviction when limits exceeded
 */

export interface CachedPost {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  state: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'REJECTED' | 'REVOKED' | 'ARCHIVED';
  dept?: string;
  images?: Array<{ url: string; size: number; type: string }>;
  video?: { url: string; source: string };
  documents?: Array<{ url: string; name: string; size: number; type: string }>;
  proposedAudience?: string;
  approvedAudience?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  cachedAt: string;
}

export interface CachedFeed {
  cacheKey: string;
  userId: string;
  audiences: string[];
  items: CachedPost[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  cachedAt: string;
  expiresAt: string;
}

export interface PendingPost {
  id: string;
  action: 'create' | 'update' | 'delete' | 'submit';
  data: any;
  timestamp: string;
  retryCount: number;
}

const DB_NAME = 'CGROfflineDB';
const DB_VERSION = 1;
const MAX_POSTS_PER_DEPT = 50;
const CACHE_DURATION_MS = 1 * 60 * 60 * 1000; // 1 hour
const MAX_RETRIES = 3;

/**
 * IndexedDB Cache Manager
 */
export class IndexedDBCache {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[Cache] IndexedDB open failed:', request.error);
        reject(request.error);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Posts store
        if (!db.objectStoreNames.contains('posts')) {
          const postStore = db.createObjectStore('posts', { keyPath: 'id' });
          postStore.createIndex('state', 'state', { unique: false });
          postStore.createIndex('dept', 'dept', { unique: false });
          postStore.createIndex('createdAt', 'createdAt', { unique: false });
          postStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Pending posts store
        if (!db.objectStoreNames.contains('pendingPosts')) {
          const pendingStore = db.createObjectStore('pendingPosts', { keyPath: 'id' });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
          pendingStore.createIndex('retryCount', 'retryCount', { unique: false });
        }

        // Feeds store
        if (!db.objectStoreNames.contains('feeds')) {
          const feedStore = db.createObjectStore('feeds', { keyPath: 'cacheKey' });
          feedStore.createIndex('userId', 'userId', { unique: false });
          feedStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[Cache] IndexedDB initialized');
        resolve();
      };
    });
  }

  /**
   * Cache a single post
   */
  async cachePost(post: CachedPost, dept?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const postToCache: CachedPost = {
      ...post,
      dept,
      cachedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['posts'], 'readwrite');
      const store = transaction.objectStore('posts');

      // Check if we need to evict old posts for this department
      if (dept) {
        this.evictOldPostsIfNeeded(dept).catch(console.error);
      }

      const request = store.put(postToCache);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('[Cache] Post cached:', post.id);
        resolve();
      };
    });
  }

  /**
   * Cache multiple posts
   */
  async cachePosts(posts: CachedPost[], dept?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    for (const post of posts) {
      await this.cachePost(post, dept);
    }
  }

  /**
   * Get a cached post
   */
  async getPost(postId: string): Promise<CachedPost | undefined> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['posts'], 'readonly');
      const store = transaction.objectStore('posts');
      const request = store.get(postId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Get posts by department (with LRU order)
   */
  async getPostsByDept(dept: string): Promise<CachedPost[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['posts'], 'readonly');
      const store = transaction.objectStore('posts');
      const deptIndex = store.index('dept');
      const request = deptIndex.getAll(dept);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const posts = request.result || [];
        // Sort by createdAt descending (most recent first)
        posts.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        resolve(posts);
      };
    });
  }

  /**
   * Get all cached posts
   */
  async getAllPosts(): Promise<CachedPost[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['posts'], 'readonly');
      const store = transaction.objectStore('posts');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Cache a feed response
   */
  async cacheFeed(feed: CachedFeed): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const feedToCache: CachedFeed = {
      ...feed,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CACHE_DURATION_MS).toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['feeds'], 'readwrite');
      const store = transaction.objectStore('feeds');
      const request = store.put(feedToCache);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('[Cache] Feed cached for user:', feed.userId);
        resolve();
      };
    });
  }

  /**
   * Get cached feed
   */
  async getFeed(cacheKey: string): Promise<CachedFeed | undefined> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['feeds'], 'readonly');
      const store = transaction.objectStore('feeds');
      const request = store.get(cacheKey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const feed = request.result;
        // Check if cache is expired
        if (feed && feed.expiresAt && new Date(feed.expiresAt) < new Date()) {
          console.log('[Cache] Feed cache expired:', cacheKey);
          resolve(undefined);
        } else {
          resolve(feed);
        }
      };
    });
  }

  /**
   * Add a pending post (offline change)
   */
  async addPendingPost(postId: string, action: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const pending: PendingPost = {
      id: postId,
      action: action as any,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingPosts'], 'readwrite');
      const store = transaction.objectStore('pendingPosts');
      const request = store.put(pending);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('[Cache] Added pending post:', postId);
        resolve();
      };
    });
  }

  /**
   * Get all pending posts
   */
  async getPendingPosts(): Promise<PendingPost[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingPosts'], 'readonly');
      const store = transaction.objectStore('pendingPosts');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const posts = request.result || [];
        // Filter by retry count
        const syncable = posts.filter((p) => p.retryCount < MAX_RETRIES);
        resolve(syncable);
      };
    });
  }

  /**
   * Mark a pending post as synced
   */
  async removePendingPost(postId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingPosts'], 'readwrite');
      const store = transaction.objectStore('pendingPosts');
      const request = store.delete(postId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('[Cache] Removed pending post:', postId);
        resolve();
      };
    });
  }

  /**
   * Increment retry count for a pending post
   */
  async incrementRetryCount(postId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const post = await this.getPendingPost(postId);
    if (!post) return;

    post.retryCount += 1;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingPosts'], 'readwrite');
      const store = transaction.objectStore('pendingPosts');
      const request = store.put(post);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get a pending post by ID
   */
  async getPendingPost(postId: string): Promise<PendingPost | undefined> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingPosts'], 'readonly');
      const store = transaction.objectStore('pendingPosts');
      const request = store.get(postId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['posts', 'feeds', 'pendingPosts'], 'readwrite');

      const postsClear = transaction.objectStore('posts').clear();
      const feedsClear = transaction.objectStore('feeds').clear();
      const pendingClear = transaction.objectStore('pendingPosts').clear();

      postsClear.onerror = () => reject(postsClear.error);
      feedsClear.onerror = () => reject(feedsClear.error);
      pendingClear.onerror = () => reject(pendingClear.error);

      transaction.oncomplete = () => {
        console.log('[Cache] All data cleared');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Evict old posts if department exceeds MAX_POSTS_PER_DEPT
   */
  private async evictOldPostsIfNeeded(dept: string): Promise<void> {
    if (!this.db) return;

    const posts = await this.getPostsByDept(dept);

    if (posts.length > MAX_POSTS_PER_DEPT) {
      const toEvict = posts.slice(MAX_POSTS_PER_DEPT);

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['posts'], 'readwrite');
        const store = transaction.objectStore('posts');

        toEvict.forEach((post) => {
          store.delete(post.id);
        });

        transaction.oncomplete = () => {
          console.log('[Cache] Evicted', toEvict.length, 'old posts for dept:', dept);
          resolve();
        };

        transaction.onerror = () => reject(transaction.error);
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalPosts: number;
    totalPendingPosts: number;
    totalFeedsCache: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['posts', 'pendingPosts', 'feeds'], 'readonly');

      const postsCount = transaction.objectStore('posts').count();
      const pendingCount = transaction.objectStore('pendingPosts').count();
      const feedsCount = transaction.objectStore('feeds').count();

      let results: any = {};

      postsCount.onsuccess = () => {
        results.totalPosts = postsCount.result;
      };

      pendingCount.onsuccess = () => {
        results.totalPendingPosts = pendingCount.result;
      };

      feedsCount.onsuccess = () => {
        results.totalFeedsCache = feedsCount.result;
      };

      transaction.oncomplete = () => {
        resolve({
          totalPosts: results.totalPosts || 0,
          totalPendingPosts: results.totalPendingPosts || 0,
          totalFeedsCache: results.totalFeedsCache || 0,
        });
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton instance
let cacheInstance: IndexedDBCache | null = null;

/**
 * Get or create cache instance
 */
export async function getCache(): Promise<IndexedDBCache> {
  if (!cacheInstance) {
    cacheInstance = new IndexedDBCache();
    await cacheInstance.init();
  }
  return cacheInstance;
}
