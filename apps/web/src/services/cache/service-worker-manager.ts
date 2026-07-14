/**
 * Service Worker Manager
 * Issue #20: Manages ServiceWorker lifecycle and synchronization
 *
 * Features:
 * - Register/unregister ServiceWorker
 * - Listen for online/offline events
 * - Trigger background sync
 * - Handle sync completion messages
 */

export type SyncEventHandler = (status: 'online' | 'offline' | 'synced') => void;

/**
 * Service Worker Manager
 */
export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: Set<SyncEventHandler> = new Set();
  private isOnline: boolean = navigator.onLine;

  /**
   * Register ServiceWorker
   */
  async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW Manager] Service Workers not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });

      console.log('[SW Manager] Service Worker registered:', this.registration);

      // Listen for messages from ServiceWorker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });
    } catch (error) {
      console.error('[SW Manager] Registration failed:', error);
      throw error;
    }
  }

  /**
   * Unregister ServiceWorker
   */
  async unregister(): Promise<void> {
    if (this.registration) {
      try {
        await this.registration.unregister();
        console.log('[SW Manager] Service Worker unregistered');
        this.registration = null;
      } catch (error) {
        console.error('[SW Manager] Unregister failed:', error);
      }
    }
  }

  /**
   * Initialize online/offline listeners
   */
  initializeNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[SW Manager] Online event');
      this.isOnline = true;
      this.notifyListeners('online');
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      console.log('[SW Manager] Offline event');
      this.isOnline = false;
      this.notifyListeners('offline');
    });
  }

  /**
   * Add listener for sync events
   */
  onSyncStatus(handler: SyncEventHandler): () => void {
    this.listeners.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(handler);
    };
  }

  /**
   * Trigger background sync
   */
  async triggerSync(): Promise<void> {
    if (!this.registration?.sync) {
      console.warn('[SW Manager] Background Sync API not supported');
      return;
    }

    try {
      await this.registration.sync.register('sync-posts');
      console.log('[SW Manager] Sync registered');
    } catch (error) {
      console.error('[SW Manager] Sync registration failed:', error);
    }
  }

  /**
   * Send message to ServiceWorker
   */
  async postMessage(message: any): Promise<void> {
    if (!this.registration?.active) {
      console.warn('[SW Manager] No active ServiceWorker');
      return;
    }

    this.registration.active.postMessage(message);
  }

  /**
   * Request sync of posts
   */
  async syncPosts(): Promise<void> {
    await this.postMessage({
      type: 'SYNC_POSTS',
      payload: {},
    });
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    await this.postMessage({
      type: 'CLEAR_CACHE',
    });
  }

  /**
   * Get offline status
   */
  async getOfflineStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        resolve(!event.data.online);
      };

      if (this.registration?.active) {
        this.registration.active.postMessage(
          { type: 'GET_OFFLINE_STATUS' },
          [channel.port2]
        );
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Handle messages from ServiceWorker
   */
  private handleMessage(message: any): void {
    const { type, payload } = message;

    switch (type) {
      case 'ONLINE':
        console.log('[SW Manager] SW notified online');
        this.isOnline = true;
        this.notifyListeners('online');
        break;

      case 'OFFLINE':
        console.log('[SW Manager] SW notified offline');
        this.isOnline = false;
        this.notifyListeners('offline');
        break;

      case 'SYNC_COMPLETE':
        console.log('[SW Manager] Sync complete:', payload);
        this.notifyListeners('synced');
        break;

      default:
        console.log('[SW Manager] Unknown message type:', type);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(status: 'online' | 'offline' | 'synced'): void {
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('[SW Manager] Listener error:', error);
      }
    });
  }

  /**
   * Check if currently online
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }
}

// Singleton instance
let swManagerInstance: ServiceWorkerManager | null = null;

/**
 * Get or create ServiceWorkerManager instance
 */
export function getServiceWorkerManager(): ServiceWorkerManager {
  if (!swManagerInstance) {
    swManagerInstance = new ServiceWorkerManager();
  }
  return swManagerInstance;
}

/**
 * Initialize ServiceWorker and network listeners
 */
export async function initializeServiceWorker(): Promise<void> {
  const manager = getServiceWorkerManager();

  try {
    await manager.register();
    manager.initializeNetworkListeners();
    console.log('[SW Manager] Service Worker initialized');
  } catch (error) {
    console.error('[SW Manager] Initialization failed:', error);
    // Don't throw - app should work without SW
  }
}
