/**
 * Offline support service for Squirrel.
 *
 * - Monitors network connectivity via NetInfo
 * - Queues create operations (expenses, incomes) when offline
 * - Auto-syncs queued items when connection is restored
 * - Caches API responses for offline viewing
 *
 * Users can Create while offline; data syncs automatically on reconnect.
 * Cached data (transactions, categories, dashboard) is available for viewing.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const KEYS = {
  OFFLINE_QUEUE: '@squirrel/offline_queue',
  CACHE_PREFIX: '@squirrel/cache/',
};

// Cache TTL: 1 hour for most data, 24 hours for categories
const CACHE_TTL = {
  default: 60 * 60 * 1000, // 1 hour
  categories: 24 * 60 * 60 * 1000, // 24 hours
};

let _isConnected = true;
let _syncInProgress = false;
let _listeners = [];

/**
 * Initialize network monitoring. Call once on app start.
 */
export function initNetworkMonitor() {
  NetInfo.addEventListener((state) => {
    const connected = state.isConnected && state.isInternetReachable !== false;
    const wasDisconnected = !_isConnected;
    _isConnected = connected;

    // Notify listeners
    _listeners.forEach((fn) => fn(connected));

    // Auto-sync when back online
    if (connected && wasDisconnected) {
      syncOfflineQueue();
    }
  });
}

/**
 * Subscribe to connectivity changes.
 * @returns {function} unsubscribe
 */
export function onConnectivityChange(listener) {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((fn) => fn !== listener);
  };
}

/**
 * Check if device is currently online.
 */
export function isOnline() {
  return _isConnected;
}

// Offline Queue

/**
 * Add a create operation to the offline queue.
 * @param {object} item - { type: 'expense'|'income', payload: {...}, createdAt: ISO }
 */
export async function enqueue(item) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.OFFLINE_QUEUE);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...item,
      createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (err) {
    console.warn('Failed to enqueue offline item:', err);
  }
}

/**
 * Get all queued items.
 */
export async function getQueue() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Remove an item from the queue by id.
 */
async function removeFromQueue(id) {
  const raw = await AsyncStorage.getItem(KEYS.OFFLINE_QUEUE);
  const queue = raw ? JSON.parse(raw) : [];
  const updated = queue.filter((item) => item.id !== id);
  await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(updated));
}

/**
 * Sync all queued offline operations to the server.
 * Called automatically when connectivity is restored.
 */
export async function syncOfflineQueue() {
  if (_syncInProgress || !_isConnected) return { synced: 0, failed: 0 };
  _syncInProgress = true;

  let synced = 0;
  let failed = 0;

  try {
    // Lazy import to avoid circular deps
    const api = require('./api').default;
    const queue = await getQueue();

    if (queue.length === 0) return { synced: 0, failed: 0 };

    for (const item of queue) {
      try {
        if (item.type === 'expense') {
          await api.post('/api/v1/expenses/', item.payload);
        } else if (item.type === 'income') {
          await api.post('/api/v1/incomes/', item.payload);
        }
        await removeFromQueue(item.id);
        synced++;
      } catch (err) {
        // If it's a 4xx error, the data is invalid — remove it anyway
        if (err?.response?.status >= 400 && err?.response?.status < 500) {
          await removeFromQueue(item.id);
          failed++;
        }
        // 5xx or network error — keep in queue for next sync
      }
    }
  } catch (err) {
    console.warn('Offline sync error:', err);
  } finally {
    _syncInProgress = false;
  }

  return { synced, failed };
}

// Response Cache

/**
 * Cache an API response.
 * @param {string} key - cache key (e.g. 'transactions_list', 'dashboard')
 * @param {any} data - data to cache
 * @param {string} ttlType - 'default' or 'categories'
 */
export async function cacheResponse(key, data, ttlType = 'default') {
  try {
    const cacheKey = KEYS.CACHE_PREFIX + key;
    const entry = {
      data,
      cachedAt: Date.now(),
      ttl: CACHE_TTL[ttlType] || CACHE_TTL.default,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (err) {
    console.warn('Cache write failed:', err);
  }
}

/**
 * Get cached response. Returns null if expired or missing.
 */
export async function getCachedResponse(key) {
  try {
    const cacheKey = KEYS.CACHE_PREFIX + key;
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    const age = Date.now() - entry.cachedAt;

    if (age > entry.ttl) {
      // Expired — but still return stale data if offline
      if (!_isConnected) return entry.data;
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Clear all cached responses.
 */
export async function clearCache() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith(KEYS.CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (err) {
    console.warn('Cache clear failed:', err);
  }
}
