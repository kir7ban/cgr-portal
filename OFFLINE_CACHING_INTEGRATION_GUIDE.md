# Offline Caching Integration Guide

## Quick Start

### 1. Initialize Service Worker in App Root

**File**: `apps/web/src/main.tsx` or `App.tsx`

```typescript
import { useEffect } from 'react';
import { CacheService } from '@/services/cache';

function App() {
  useEffect(() => {
    // Initialize offline caching on app startup
    CacheService.initialize().catch((error) => {
      console.warn('Offline caching failed to initialize:', error);
      // App will still work without caching
    });
  }, []);

  return (
    // Your app JSX
  );
}
```

### 2. Use React Hook for Status Display

**File**: `apps/web/src/components/OfflineIndicator.tsx`

```typescript
import { useOfflineCache } from '@/hooks/useOfflineCache';

export function OfflineIndicator() {
  const { isOffline, syncStatus, pendingCount, isSyncing } = useOfflineCache();

  if (!isOffline && !pendingCount) {
    return null;
  }

  return (
    <div className="offline-indicator" style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '12px 16px',
      backgroundColor: isOffline ? '#ff9800' : '#4caf50',
      color: 'white',
      borderRadius: '4px',
      fontSize: '14px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      {isOffline ? (
        <span>
          📡 Offline • {pendingCount} pending
          {isSyncing && ' • Syncing...'}
        </span>
      ) : (
        <span>
          ✓ {pendingCount > 0 ? `${pendingCount} synced` : 'All synced'}
        </span>
      )}
    </div>
  );
}
```

Add to app layout:

```typescript
return (
  <div>
    <OfflineIndicator />
    {/* rest of app */}
  </div>
);
```

## Integration Examples

### Example 1: Cache Feed After Loading

**Before** (current implementation):

```typescript
async function loadFeed(page: number, pageSize: number) {
  const response = await api.get('/api/feed', {
    params: { page, pageSize }
  });
  setFeed(response.data);
  return response.data;
}
```

**After** (with caching):

```typescript
async function loadFeed(page: number, pageSize: number) {
  try {
    const response = await api.get('/api/feed', {
      params: { page, pageSize }
    });

    // Cache the posts
    const userId = getCurrentUserId();
    const userAudiences = getUserAudiences();
    
    await CacheService.cachePosts(response.data.items, userDept);
    
    // Cache feed response for offline viewing
    const cacheKey = CacheService.generateFeedCacheKey(
      userId,
      userAudiences,
      page,
      pageSize
    );
    
    await CacheService.cacheFeed({
      cacheKey,
      userId,
      audiences: userAudiences,
      items: response.data.items,
      totalCount: response.data.totalCount,
      pageNumber: response.data.pageNumber,
      pageSize: response.data.pageSize,
      totalPages: response.data.totalPages,
      hasNextPage: response.data.hasNextPage,
      hasPreviousPage: response.data.hasPreviousPage,
    });

    setFeed(response.data);
    return response.data;
  } catch (error) {
    // Fall back to cache if offline
    if (CacheService.isOffline()) {
      const userId = getCurrentUserId();
      const userAudiences = getUserAudiences();
      const cacheKey = CacheService.generateFeedCacheKey(
        userId,
        userAudiences,
        page,
        pageSize
      );
      
      const cachedFeed = await CacheService.getFeed(cacheKey);
      if (cachedFeed) {
        console.log('[Feed] Using cached data');
        setFeed(cachedFeed);
        return cachedFeed;
      }
    }
    throw error;
  }
}
```

### Example 2: Handle Offline Post Creation

**Before** (current implementation):

```typescript
async function createPost(title: string, content: string) {
  const response = await api.post('/api/posts', { title, content });
  setPosts([response.data, ...posts]);
  return response.data;
}
```

**After** (with offline support):

```typescript
async function createPost(title: string, content: string) {
  const postId = generateId(); // Generate unique ID
  const post = {
    id: postId,
    title,
    content,
    createdBy: getCurrentUserId(),
    state: 'DRAFT' as const,
    createdAt: new Date().toISOString(),
  };

  // Always add optimistically
  setPosts([post, ...posts]);

  if (CacheService.isOffline()) {
    // Queue for sync when online
    await CacheService.queuePostSync(postId, 'create', {
      title,
      content,
    });
    
    // Show pending indicator
    setPendingPostIds(prev => [...prev, postId]);
    
    return post;
  }

  try {
    const response = await api.post('/api/posts', { title, content });
    
    // Replace with server response
    setPosts(prev =>
      prev.map(p => p.id === postId ? response.data : p)
    );
    
    return response.data;
  } catch (error) {
    // If creation failed, queue for retry
    await CacheService.queuePostSync(postId, 'create', { title, content });
    setPendingPostIds(prev => [...prev, postId]);
    return post;
  }
}
```

### Example 3: Listen for Sync Completion

```typescript
function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [syncStatus, setSyncStatus] = useState<string>('');

  useEffect(() => {
    // Listen for sync status changes
    const unsubscribe = CacheService.onSyncStatus((status, details) => {
      if (status === 'syncing') {
        setSyncStatus('Syncing offline changes...');
      } else if (status === 'completed') {
        setSyncStatus(`✓ Synced ${details.synced} posts`);
        // Refresh posts from server
        loadPosts();
        
        // Clear status after 3 seconds
        setTimeout(() => setSyncStatus(''), 3000);
      } else if (status === 'error') {
        setSyncStatus('❌ Sync failed - will retry');
      }
    });

    return unsubscribe;
  }, []);

  return (
    <div>
      {syncStatus && (
        <div className="sync-status">{syncStatus}</div>
      )}
      {/* post list */}
    </div>
  );
}
```

### Example 4: Fallback to Cached Post

```typescript
async function viewPost(postId: string) {
  try {
    const response = await api.get(`/api/posts/${postId}`);
    setPost(response.data);
    
    // Cache for offline viewing
    await CacheService.cachePost({
      ...response.data,
      cachedAt: new Date().toISOString(),
    }, userDept);
    
    return response.data;
  } catch (error) {
    if (CacheService.isOffline()) {
      // Try cache
      const cached = await CacheService.getPost(postId);
      if (cached) {
        setPost(cached);
        showNotification('Viewing cached version');
        return cached;
      }
    }
    throw error;
  }
}
```

## Service Worker Manifest File

Add to `public/manifest.json`:

```json
{
  "name": "Bosch Internal Communications",
  "short_name": "CGR",
  "description": "Internal social media for Bosch",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#1976d2",
  "icons": [
    {
      "src": "/favicon.ico",
      "sizes": "16x16 32x32",
      "type": "image/x-icon"
    }
  ],
  "screenshots": [],
  "shortcuts": []
}
```

## Vite Configuration

Update `apps/web/vite.config.ts` to serve manifest and service worker:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    // Serve public files
    middlewares: {
      // Ensures service-worker.js and manifest.json are served
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Ensure public assets are copied
    assetsDir: 'assets',
  },
});
```

## HTML Setup

Ensure `public/index.html` has manifest reference:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#1976d2" />
  <link rel="manifest" href="/manifest.json" />
  <title>Bosch Internal Communications</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

## TypeScript Configuration

Ensure `tsconfig.json` includes service worker types:

```json
{
  "compilerOptions": {
    "lib": [
      "ES2020",
      "DOM",
      "DOM.Iterable",
      "WebWorker"
    ],
    "types": [
      "node",
      "vitest/globals"
    ]
  }
}
```

## Network Error Handling

Update your API client to handle offline gracefully:

```typescript
import axios, { AxiosError } from 'axios';
import { CacheService } from '@/services/cache';

const api = axios.create({
  baseURL: '/api',
});

// Intercept errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Check if offline
    if (!navigator.onLine || CacheService.isOffline()) {
      const message = 'Offline - changes will sync when connection restored';
      console.warn(message);
      
      // Could trigger offline UI here
      return Promise.reject({
        ...error,
        isOffline: true,
        message,
      });
    }

    return Promise.reject(error);
  }
);

export default api;
```

## Testing Offline Behavior

### In Chrome DevTools:

1. **Simulate offline**:
   - DevTools → Network tab
   - Throttling dropdown → "Offline"

2. **View cache**:
   - Application → IndexedDB → CGROfflineDB
   - Inspect posts, feeds, pendingPosts stores

3. **View Service Worker**:
   - Application → Service Workers
   - Should show `/service-worker.js` (active)

4. **Monitor sync**:
   - Open Console
   - Look for `[Cache]`, `[Sync Manager]` logs

### Manual Test Flow:

1. Load feed while online (posts cached)
2. Switch to offline mode
3. View feed (should load from cache)
4. Create a post (should queue)
5. Switch back online
6. Post should sync automatically
7. Check `pending` in DevTools → IndexedDB

## Performance Optimization Tips

1. **Limit cache size**: Monitor stats regularly
   ```typescript
   const stats = await CacheService.getStats();
   if (stats.totalPosts > 100) {
     await CacheService.clearCache();
   }
   ```

2. **Periodic cleanup**: Clear old cache entries
   ```typescript
   setInterval(async () => {
     const stats = await CacheService.getStats();
     console.log('Cache stats:', stats);
   }, 60000); // Every minute
   ```

3. **Compress large posts**: Store minimal fields
   ```typescript
   const minimized = {
     id: post.id,
     title: post.title,
     content: post.content.substring(0, 500), // First 500 chars
     createdAt: post.createdAt,
   };
   ```

4. **Lazy load images**: Don't cache image data
   ```typescript
   // Cache post without images
   const { images, ...postWithoutImages } = post;
   await CacheService.cachePost(postWithoutImages);
   ```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Service Worker not registered | Check HTTPS (required in production) |
| Cache not working | Check DevTools → Application → Service Workers |
| Sync not working | Check Background Sync support, use manual sync |
| IndexedDB quota exceeded | Reduce MAX_POSTS_PER_DEPT or clear old caches |
| Posts not syncing | Check network, look for errors in console |
| Duplicate posts after sync | Use post ID to deduplicate client-side |

## Summary

The offline caching system:
- ✅ Automatically caches posts (50/dept)
- ✅ Caches feed responses for offline viewing
- ✅ Queues changes when offline
- ✅ Syncs automatically when online
- ✅ Provides UI hooks for status display
- ✅ Handles network errors gracefully
- ✅ Works in modern browsers (except IE)
