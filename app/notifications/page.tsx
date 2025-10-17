'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession(); // Usar useSession

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) { // Solo cargar notificaciones si hay un usuario
      fetchNotifications();
    }
  }, [router, user, sessionLoading]);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications');

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch notifications');
      }

      const data: Notification[] = await res.json();
      setNotifications(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`,
        {
          method: 'PUT',
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to mark notification as read');
      }

      fetchNotifications(); // Refresh notifications
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-as-read', {
        method: 'PUT',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to mark all notifications as read');
      }

      fetchNotifications(); // Refresh notifications
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  if (loading) {
    return <div className="container mt-5">Cargando notificaciones...</div>;
  }

  if (error) {
    return <div className="container mt-5 alert alert-danger">Error: {error}</div>;
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
                      <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => handleMarkAsRead(notification.id)}>
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