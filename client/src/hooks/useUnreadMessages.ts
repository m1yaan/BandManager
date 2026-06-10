import { useState, useEffect, useCallback, useRef } from 'react';
import { messagesApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Listener = (count: number) => void;
const listeners = new Set<Listener>();
let globalCount = 0;

export function notifyUnreadCountChange(count: number) {
  globalCount = count;
  listeners.forEach(l => l(count));
}

export function useUnreadMessages() {
  const { user, isManager, isAdmin } = useAuth();
  const [count, setCount] = useState(globalCount);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    if (!user || (!isManager && !isAdmin)) return;
    try {
      const data = await messagesApi.getUnreadCount();
      notifyUnreadCountChange(data.count);
    } catch { /* silent */ }
  }, [user, isManager, isAdmin]);

  useEffect(() => {
    const listener: Listener = (c) => setCount(c);
    listeners.add(listener);

    fetchCount();
    intervalRef.current = setInterval(fetchCount, 30_000);

    return () => {
      listeners.delete(listener);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCount]);

  const refresh = useCallback(() => { fetchCount(); }, [fetchCount]);

  return { count, refresh };
}
