import { useEffect, useRef, useState } from "react";

type SSEOptions<T> = {
  url: string;
  onMessage?: (data: T) => void;
  onError?: (err: any) => void;
  reconnectInterval?: number;
  heartbeatTimeout?: number;
};

export function useSSE<T extends { type: string } = any>(props: SSEOptions<T>) {
  const {
    url,
    onMessage,
    onError,
    reconnectInterval = 2000,
    heartbeatTimeout = 30000,
  } = props;
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = () => {
    if (
      eventSourceRef.current &&
      eventSourceRef.current.readyState === EventSource.OPEN
    ) {
      return;
    }

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      resetHeartbeat();
    };

    es.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as T;

      if (parsed?.type === "connected") {
        setConnected(true);
        return;
      }

      if (parsed?.type === "ping") {
        resetHeartbeat();
        return;
      }

      onMessage?.(parsed);
    };

    es.onerror = (err) => {
      setConnected(false);
      if (onError) onError(err);

      cleanup();
      scheduleReconnect();
    };
  };

  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current);
  };

  const scheduleReconnect = () => {
    reconnectTimeout.current = setTimeout(connect, reconnectInterval);
  };

  const resetHeartbeat = () => {
    if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current);
    heartbeatTimer.current = setTimeout(() => {
      setConnected(false);
      cleanup();
      scheduleReconnect();
    }, heartbeatTimeout);
  };

  useEffect(() => {
    connect();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (
          !eventSourceRef.current ||
          eventSourceRef.current.readyState === EventSource.CLOSED
        ) {
          cleanup();
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cleanup();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [url]);

  return { connected };
}
