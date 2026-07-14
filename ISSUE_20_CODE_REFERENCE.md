# Issue #20: Offline Caching - Code Reference

Quick reference for ServiceWorker and cache implementation.

## Service Worker (public/service-worker.js)

### Installation

```javascript
// Caches static assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});
```

### Fetch Interception

```javascript
// Network-first for API
if (url.pathname.startsWith('/api/')) {
  return event.respondWith(networkFirstStrategy(request));
}

// Cache-first for assets
if (isStaticAsset(url.pathname)) {
  return event.respondWith(cacheFirstStrategy(request));
}

// Stale-while-revalidate for HTML
if (request.headers.get('accept')?.includes('text/html')) {
  return event.respondWith(staleWhileRevalidateStrategy(request));
}
```

### Caching Strategies

**Network-First**:
```javascript
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Fallback to cache
    return caches.match(request) || offlineFallback();
  }
}
```

**Cache-First**:
```javascript
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return offlineFallback();
  }
}
```

**Stale-While-Revalidate**:
```javascript
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(DYNAMIC_CACHE);
      cache.then((c) => c.put(request, response.clone()));
    }
    return response;
  });
  
  return cachedResponse || fetchPromise;
}
```

### Background Sync

```javascript
// Register sync tag
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
});

async function syncPosts() {
  const db = await openIndexedDB();
  const pendingPosts = await getPendingPosts(db);
  
  for (const post of pendingPosts) {
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post.data),
      });
      
      if (response.ok) {
        await markPostSynced(db, post.id);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

### Message Handling

```javascript
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SYNC_POSTS':
      handleSyncPosts(payload);
      break;
    case 'CLEAR_CACHE':
      handleClearCache();
      break;
    case 'GET_OFFLINE_STATUS':
      event.ports[0].postMessage({ online: navigator.onLine });
      break;
  }
});
```

## IndexedDB Cache (indexeddb-cache.ts)

### Initialization

```typescript
async init(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CGROfflineDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create stores
      const postStore = db.createObjectStore('posts', { keyPath: 'id' });
      postStore.createIndex('state', 'state', { unique: false });
      postStore.createIndex('dept', 'dept', { unique: false });
      
      db.createObjectStore('pendingPosts', { keyPath: 'id' });
      db.createObjectStore('feeds', { keyPath: 'cacheKey' });
    };
    
    request.onsuccess = () => {
      this.db = request.result;
      resolve();
    };
  });
}
```

### Caching Posts

```typescript
async cachePost(post: CachedPost, dept?: string): Promise<void> {
  const postToCache: CachedPost = {
    ...post,
    dept,
    cachedAt: new Date().toISOString(),
  };
  
  return new Promise((resolve, reject) => {
    const transaction = this.db!.transaction(['posts'], 'readwrite');
    const store = transaction.objectStore('posts');
    
    // Evict old posts if needed
    this.evictOldPostsIfNeeded(dept);
    
    const request = store.put(postToCache);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
```

### Retrieving Cached Posts

```typescript
async getPostsByDept(dept: string): Promise<CachedPost[]> {
  return new Promise((resolve, reject) => {
    const transaction = this.db!.transaction(['posts'], 'readonly');
    const store = transaction.objectStore('posts');
    const deptIndex = store.index('dept');
    const request = deptIndex.getAll(dept);
    
    request.onsuccess = () => {
      const posts = request.result || [];
      // Sort by createdAt descending
      posts.sort(
        (a, b) => new Date(b.createdAt).getTime() - 
                   new Date(a.createdAt).getTime()
      );
      resolve(posts);
    };
  });
}
```

### Feed Caching

```typescript
async cacheFeed(feed: CachedFeed): Promise<void> {
  const feedToCache: CachedFeed = {
    ...feed,
    cachedAt: new Date().toISOString(),
    expiresAt: new Date(
      Date.now() + CACHE_DURATION_MS
    ).toISOString(),
  };
  
  return new Promise((resolve, reject) => {
    const transaction = this.db!.transaction(['feeds'], 'readwrite');
    const store = transaction.objectStore('feeds');
    const request = store.put(feedToCache);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
```

### Pending Posts (Offline Sync)

```typescript
async addPendingPost(postId: string, action: string, data: any): Promise<void> {
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
    request.onsuccess = () => resolve();
  });
}
```

### LRU Eviction

```typescript
private async evictOldPostsIfNeeded(dept: string): Promise<void> {
  const posts = await this.getPostsByDept(dept);
  
  if (posts.length > MAX_POSTS_PER_DEPT) {
    const toEvict = posts.slice(MAX_POSTS_PER_DEPT);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['posts'], 'readwrite');
      const store = transaction.objectStore('posts');
      
      toEvict.forEach((post) => {
        store.delete(post.id);
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
```

## ServiceWorker Manager (service-worker-manager.ts)

### Registration

```typescript
async register(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return;
  }
  
  this.registration = await navigator.serviceWorker.register(
    '/service-worker.js',
    { scope: '/' }
  );
  
  // Listen for messages
  navigator.serviceWorker.addEventListener('message', (event) => {
    this.handleMessage(event.data);
  });
}
```

### Network Status Monitoring

```typescript
initializeNetworkListeners(): void {
  window.addEventListener('online', () => {
    this.isOnline = true;
    this.notifyListeners('online');
    this.triggerSync();
  });
  
  window.addEventListener('offline', () => {
    this.isOnline = false;
    this.notifyListeners('offline');
  });
}
```

### Background Sync Trigger

```typescript
async triggerSync(): Promise<void> {
  if (!this.registration?.sync) {
    console.warn('Background Sync API not supported');
    return;
  }
  
  try {
    await this.registration.sync.register('sync-posts');
    console.log('Sync registered');
  } catch (error) {
    console.error('Sync registration failed:', error);
  }
}
```

### Message Protocol

```typescript
private handleMessage(message: any): void {
  const { type, payload } = message;
  
  switch (type) {
    case 'ONLINE':
      this.isOnline = true;
      this.notifyListeners('online');
      break;
    case 'OFFLINE':
      this.isOnline = false;
      this.notifyListeners('offline');
      break;
    case 'SYNC_COMPLETE':
      this.notifyListeners('synced');
      break;
  }
}
```

## Offline Sync Manager (offline-sync-manager.ts)

### Sync Orchestration

```typescript
async sync(): Promise<void> {
  if (this.isSyncing) return;
  
  this.isSyncing = true;
  this.notifyCallbacks('syncing', { message: 'Starting sync...' });
  
  try {
    const cache = await getCache();
    const pendingPosts = await cache.getPendingPosts();
    
    let synced = 0;
    let failed = 0;
    
    for (const post of pendingPosts) {
      try {
        const success = await this.syncPost(post);
        
        if (success) {
          await cache.removePendingPost(post.id);
          synced++;
        } else {
          await cache.incrementRetryCount(post.id);
          failed++;
        }
      } catch (error) {
        await cache.incrementRetryCount(post.id);
        failed++;
      }
    }
    
    this.notifyCallbacks('completed', { synced, failed });
  } finally {
    this.isSyncing = false;
  }
}
```

### Sync Single Post

```typescript
private async syncPost(post: PendingPost): Promise<boolean> {
  const { id, action, data } = post;
  
  try {
    let url: string, method: string, body: string;
    
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
    }
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method !== 'DELETE' ? body : undefined,
    });
    
    return response.ok;
  } catch (error) {
    console.error('Sync error:', id, error);
    return false;
  }
}
```

## Cache Service (cache-service.ts)

### Initialization

```typescript
static async initialize(): Promise<void> {
  try {
    // Initialize IndexedDB
    await getCache();
    
    // Register ServiceWorker
    await initializeServiceWorker();
    
    // Initialize offline sync
    await initializeOfflineSync();
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}
```

### High-Level API

```typescript
// Cache posts
static async cachePosts(posts: CachedPost[], dept?: string): Promise<void> {
  const cache = await getCache();
  await cache.cachePosts(posts, dept);
}

// Get cached feed
static async getFeed(cacheKey: string): Promise<CachedFeed | undefined> {
  const cache = await getCache();
  return cache.getFeed(cacheKey);
}

// Queue offline change
static async queuePostSync(
  postId: string,
  action: 'create' | 'update' | 'delete' | 'submit',
  data: any
): Promise<void> {
  const syncManager = getSyncManager();
  await syncManager.queuePost(postId, action, data);
}

// Start sync
static async sync(): Promise<void> {
  const syncManager = getSyncManager();
  await syncManager.sync();
}
```

## React Hook (useOfflineCache.ts)

### Hook Implementation

```typescript
export function useOfflineCache(): UseOfflineCacheResult {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  
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
  
  return {
    isOnline,
    isOffline: !isOnline,
    syncStatus,
    pendingCount,
    isSyncing: syncStatus === 'syncing',
    sync: () => CacheService.sync(),
    clearCache: () => CacheService.clearCache(),
  };
}
```

### Component Usage

```typescript
function App() {
  const { isOffline, pendingCount, sync } = useOfflineCache();
  
  if (isOffline) {
    return (
      <div className="offline-banner">
        <span>Offline • {pendingCount} pending</span>
        <button onClick={sync}>Sync Now</button>
      </div>
    );
  }
  
  return <MainApp />;
}
```

## Integration Pattern

### In Component

```typescript
async function loadFeed(page: number) {
  try {
    // Try network first
    const response = await api.getFeed(page);
    
    // Cache the posts
    await CacheService.cachePosts(response.items, userDept);
    
    // Cache feed for offline
    const cacheKey = CacheService.generateFeedCacheKey(
      userId, audiences, page, pageSize
    );
    await CacheService.cacheFeed({
      cacheKey, userId, audiences,
      items: response.items,
      ...response,
    });
    
    return response;
  } catch (error) {
    // Try cache if offline
    if (CacheService.isOffline()) {
      const cacheKey = CacheService.generateFeedCacheKey(
        userId, audiences, page, pageSize
      );
      const cached = await CacheService.getFeed(cacheKey);
      if (cached) return cached;
    }
    throw error;
  }
}
```

### Offline Post Creation

```typescript
async function createPost(title: string, content: string) {
  const postId = generateId();
  const post = {
    id: postId,
    title,
    content,
    createdBy: userId,
    state: 'DRAFT',
    createdAt: new Date().toISOString(),
  };
  
  // Show optimistically
  setPosts([post, ...posts]);
  
  if (CacheService.isOffline()) {
    // Queue for sync
    await CacheService.queuePostSync(postId, 'create', {
      title,
      content,
    });
    setPendingIds([...pendingIds, postId]);
    return post;
  }
  
  try {
    const response = await api.createPost({ title, content });
    setPosts(prev => prev.map(p => 
      p.id === postId ? response.data : p
    ));
    return response.data;
  } catch (error) {
    // Queue for retry
    await CacheService.queuePostSync(postId, 'create', {
      title, content
    });
    return post;
  }
}
```

## Types Reference

```typescript
interface CachedPost {
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

interface CachedFeed {
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

interface PendingPost {
  id: string;
  action: 'create' | 'update' | 'delete' | 'submit';
  data: any;
  timestamp: string;
  retryCount: number;
}

interface UseOfflineCacheResult {
  isOnline: boolean;
  isOffline: boolean;
  syncStatus: 'pending' | 'syncing' | 'completed' | 'error' | null;
  pendingCount: number;
  isSyncing: boolean;
  sync: () => Promise<void>;
  clearCache: () => Promise<void>;
}
```

## Common Patterns

### Pattern: Cache on Success

```typescript
const response = await fetch('/api/posts');
const posts = await response.json();
await CacheService.cachePosts(posts, dept);
```

### Pattern: Fallback to Cache

```typescript
try {
  return await api.getPosts();
} catch (err) {
  if (CacheService.isOffline()) {
    return await CacheService.getPostsByDept(dept);
  }
  throw err;
}
```

### Pattern: Queue Offline Changes

```typescript
if (CacheService.isOffline()) {
  await CacheService.queuePostSync(id, 'update', data);
} else {
  await api.updatePost(id, data);
}
```

### Pattern: Monitor Sync Status

```typescript
CacheService.onSyncStatus((status, details) => {
  if (status === 'completed') {
    showNotification(`${details.synced} posts synced`);
  }
});
```
