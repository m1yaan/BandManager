import { useState, useEffect, useCallback, useRef } from 'react';
import { messagesApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function useUnreadMessages() {
  const { user, isManager, isAdmin } = useAuth();
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    // Задача 5: только для manager/admin, только реальные данные
    if (!user || (!isManager && !isAdmin)) return;
    try {
      const data = await messagesApi.getUnreadCount();
      setCount(data.count);
    } catch {
      // Не ломаем интерфейс если endpoint недоступен
    }
  }, [user, isManager, isAdmin]);

  useEffect(() => {
    fetchCount();
    // Обновляем каждые 30 секунд
    intervalRef.current = setInterval(fetchCount, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCount]);

  // Принудительное обновление при открытии Inbox
  const refresh = useCallback(() => {
    fetchCount();
  }, [fetchCount]);

  return { count, refresh };
}
