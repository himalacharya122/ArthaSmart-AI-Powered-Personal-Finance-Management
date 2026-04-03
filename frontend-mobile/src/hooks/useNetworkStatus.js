/**
 * Hook that tracks network connectivity status.
 * Returns { isConnected, pendingCount } for offline awareness.
 */
import { useState, useEffect } from 'react';
import { onConnectivityChange, isOnline, getQueue } from '../services/offline';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsub = onConnectivityChange((connected) => {
      setIsConnected(connected);
      if (connected) {
        // Refresh pending count after sync
        setTimeout(async () => {
          const queue = await getQueue();
          setPendingCount(queue.length);
        }, 2000);
      }
    });

    // Initial pending count
    getQueue().then((q) => setPendingCount(q.length));

    return unsub;
  }, []);

  return { isConnected, pendingCount };
}
