import React from 'react';
import { NotificationToast } from './NotificationToast';
import { useNotifications, Notification } from '../contexts/NotificationContext';

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  // Mostrar apenas as 5 notificações mais recentes
  const visibleNotifications = notifications
    .filter(n => n.duration && n.duration > 0)
    .slice(0, 5);

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {visibleNotifications.map((notification: Notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
}