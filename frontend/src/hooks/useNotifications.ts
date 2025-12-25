import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  duration?: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    message: string,
    type: Notification['type'] = 'error',
    duration: number = 7000 // Default 7 seconds for errors
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    const notification: Notification = { id, message, type, duration };

    setNotifications((prev) => [...prev, notification]);

    return id;
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAll,
  };
}
