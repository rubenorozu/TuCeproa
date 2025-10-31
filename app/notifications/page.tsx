'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext'; // Importar useSession

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  reservationId?: string;
  reservation?: {
    id: string;
    space?: { name: string };
    equipment?: { name: string };
    workshop?: { name: string };
    startTime: string;
    endTime: string;
  } | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading, notifications, markNotificationAsRead, fetchNotifications } = useSession(); // Usar useSession

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push('/login');
    }
    if (user) {
      handleMarkAllAsRead();
    }
  }, [router, user, sessionLoading]);

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-as-read', {
        method: 'PUT',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to mark all notifications as read');
      }

      fetchNotifications(); // Refresh notifications
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err);
      } else {
        console.error('An unknown error occurred');
      }
    }
  };

  if (sessionLoading) {
    return <div className="container mt-5">Cargando notificaciones...</div>;
  }

  const groupedNotifications = notifications.reduce((acc, notification) => {
    const reservationId = notification.reservationId || 'no-reservation';
    if (!acc[reservationId]) {
      acc[reservationId] = { reservation: notification.reservation, notifications: [] };
    }
    acc[reservationId].notifications.push(notification);
    return acc;
  }, {} as Record<string, { reservation: Notification['reservation'], notifications: Notification[] }>);

  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <div className="d-flex justify-content-between align-items-center">
        <h2 style={{ color: '#0076A8' }}>Mis Notificaciones</h2>
        {notifications.some(n => !n.read) && (
          <button className="btn btn-sm btn-outline-primary" onClick={handleMarkAllAsRead}>
            Marcar todas como leídas
          </button>
        )}
      </div>
      <hr />
      {notifications.length === 0 ? (
        <div className="alert alert-info">No tienes notificaciones.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedNotifications).map(([reservationId, group]) => (
            <div key={reservationId} className="card shadow-sm">
              <div className="card-header" style={{ backgroundColor: '#0076A8', color: 'white' }}>
                {group.reservation ? (
                  <>
                    <strong>Reserva: </strong>
                    {group.reservation.space?.name || group.reservation.equipment?.name || group.reservation.workshop?.name}
                    <br />
                    <small>{new Date(group.reservation.startTime).toLocaleString()} - {new Date(group.reservation.endTime).toLocaleString()}</small>
                  </>
                ) : (
                  <strong>Notificaciones Generales</strong>
                )}
              </div>
              <ul className="list-group list-group-flush">
                {group.notifications.map(notification => (
                  <li key={notification.id} className={`list-group-item d-flex justify-content-between align-items-center ${notification.read ? '' : 'list-group-item-info'}`}>
                    <div>
                      <h5 className="mb-1">{notification.message}</h5>
                      <small>{new Date(notification.createdAt).toLocaleString()}</small>
                    </div>
                    {!notification.read && (
                      <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => markNotificationAsRead(notification.id)}>
                        Marcar como leída
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
