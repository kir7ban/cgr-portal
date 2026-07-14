/**
 * Service Worker for Offline Caching
 * Issue #20: Offline caching implementation
 *
 * Features:
 * - Cache API for assets and static resources
 * - IndexedDB for posts and feed data (50 posts/dept max)
 * - Background sync for offline changes
 * - Automatic sync on reconnect
 * - Stale-while-revalidate for fast loads
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
];

const CACHE_NAMES = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];

/**
 * Install event: Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event: Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => !CACHE_NAMES.includes(cacheName))
            .map((cacheName) => {
              console.log('[Service Worker] Deleting cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event: Network-first or cache-first strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // API requests: Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(networkFirstStrategy(request));
  }

  // Static assets: Cache first, fallback to network
  if (isStaticAsset(url.pathname)) {
    return event.respondWith(cacheFirstStrategy(request));
  }

  // HTML pages: Stale-while-revalidate
  if (request.headers.get('accept')?.includes('text/html')) {
    return event.respondWith(staleWhileRevalidateStrategy(request));
  }

  // Default: Network first
  return event.respondWith(networkFirstStrategy(request));
});

/**
 * Network-first strategy: Try network first, fallback to cache
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);

    // Cache successful API responses
    if (response.ok && request.url.startsWith(new URL(self.location).origin + '/api/')) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[Service Worker] Network failed, using cache:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback
    return new Response(
      JSON.stringify({ error: 'Offline - resource not cached' }),
      { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Cache-first strategy: Try cache first, fallback to network
 */
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
    console.log('[Service Worker] Cache and network failed:', request.url);
    return new Response(
      'Resource not found',
      { status: 404, statusText: 'Not Found' }
    );
  }
}

/**
 * Stale-while-revalidate strategy: Return cached version immediately,
 * update cache in background
 */
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

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i.test(pathname);
}

/**
 * Message event: Handle messages from clients
 */
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
    default:
      console.log('[Service Worker] Unknown message type:', type);
  }
});

/**
 * Background sync: Sync posts when connection is restored
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
});

/**
 * Handle sync posts message
 */
async function handleSyncPosts(payload) {
  console.log('[Service Worker] Syncing posts:', payload);
  // This is called from the client-side sync manager
  // The actual sync is handled by the syncPosts function
}

/**
 * Sync offline posts with server
 */
async function syncPosts() {
  try {
    console.log('[Service Worker] Starting background sync...');
    const db = await openIndexedDB();
    const pendingPosts = await getPendingPosts(db);

    if (pendingPosts.length === 0) {
      console.log('[Service Worker] No pending posts to sync');
      return;
    }

    console.log('[Service Worker] Syncing', pendingPosts.length, 'posts...');

    for (const post of pendingPosts) {
      try {
        const response = await fetch(`/api/posts/${post.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(post.data),
        });

        if (response.ok) {
          await markPostSynced(db, post.id);
          console.log('[Service Worker] Synced post:', post.id);
        } else {
          console.error('[Service Worker] Failed to sync post:', post.id, response.status);
        }
      } catch (error) {
        console.error('[Service Worker] Error syncing post:', post.id, error);
      }
    }

    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        synced: pendingPosts.length,
      });
    });
  } catch (error) {
    console.error('[Service Worker] Background sync failed:', error);
  }
}

/**
 * Handle clear cache message
 */
async function handleClearCache() {
  console.log('[Service Worker] Clearing all caches...');
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log('[Service Worker] Caches cleared');
}

/**
 * Open or create IndexedDB
 */
async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CGROfflineDB', 1);

    request.onerror = () => {
      console.error('[Service Worker] IndexedDB open failed');
      reject(request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('posts')) {
        const postStore = db.createObjectStore('posts', { keyPath: 'id' });
        postStore.createIndex('state', 'state', { unique: false });
        postStore.createIndex('dept', 'dept', { unique: false });
        postStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('pendingPosts')) {
        db.createObjectStore('pendingPosts', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('feeds')) {
        const feedStore = db.createObjectStore('feeds', { keyPath: 'cacheKey' });
        feedStore.createIndex('userId', 'userId', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

/**
 * Get pending posts that need to be synced
 */
async function getPendingPosts(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingPosts'], 'readonly');
    const store = transaction.objectStore('pendingPosts');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result || []);
    };
  });
}

/**
 * Mark a post as synced
 */
async function markPostSynced(db, postId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingPosts'], 'readwrite');
    const store = transaction.objectStore('pendingPosts');
    const request = store.delete(postId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Online event: Trigger sync when connection is restored
 */
self.addEventListener('online', () => {
  console.log('[Service Worker] Online - triggering sync');

  // Register background sync
  if (self.registration && self.registration.sync) {
    self.registration.sync.register('sync-posts');
  }

  // Notify all clients
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'ONLINE' });
    });
  });
});

/**
 * Offline event: Notify clients
 */
self.addEventListener('offline', () => {
  console.log('[Service Worker] Offline');

  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'OFFLINE' });
    });
  });
});

console.log('[Service Worker] Loaded and ready');
