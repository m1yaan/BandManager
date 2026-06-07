import { useEffect, useRef } from 'react';
import { messagesApi } from '../lib/api';

type AutoInterval = 0 | 15 | 30 | 60;

export function useAutoMessages(
  intervalSecs: AutoInterval,
  onNewMessages: () => void
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onNewRef = useRef(onNewMessages);
  onNewRef.current = onNewMessages;

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (intervalSecs === 0) return;

    timerRef.current = setInterval(async () => {
      try {
        await messagesApi.generate();
        onNewRef.current();
      } catch { /* silent */ }
    }, intervalSecs * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [intervalSecs]);
}
