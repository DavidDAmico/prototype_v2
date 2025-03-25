import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function useTokenRefresh(router: ReturnType<typeof useRouter>) {
  const lastActivityTime = useRef<number>(Date.now());
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  // Track user activity
  const updateLastActivity = () => {
    lastActivityTime.current = Date.now();
  };

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:9000/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error('Token refresh failed');
      }

      // Get the response data
      const data = await res.json();

      // Check if user has been inactive for too long
      const inactiveTime = Date.now() - lastActivityTime.current;
      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        clearRefreshTimer();
        router.push('/login');
        return false;
      }

      // Schedule next refresh based on server's expiration time
      const nextRefresh = Math.max(10000, (data.expiresIn * 1000) - 60000); // Refresh 1 minute before expiry, minimum 10 seconds
      clearRefreshTimer();
      refreshTimerRef.current = setTimeout(() => {
        refreshToken();
      }, nextRefresh);

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearRefreshTimer();
      router.push('/login');
      return false;
    }
  }, [router]);

  useEffect(() => {
    // Skip initial refresh on mount to avoid immediate token refresh
    if (isInitialMount.current) {
      isInitialMount.current = false;
      
      // Schedule first refresh for 14 minutes from now
      refreshTimerRef.current = setTimeout(() => {
        refreshToken();
      }, REFRESH_INTERVAL);
    }

    // Add activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'mousemove', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateLastActivity);
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateLastActivity);
      });
      clearRefreshTimer();
    };
  }, [refreshToken]); // router is included via refreshToken
}
