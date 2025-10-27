'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext'; // Import useSession

interface Notification {
  id: string;
  message: string;
  read: boolean;
}

const Navbar = () => {
  const router = useRouter();
  const { user, loading: sessionLoading, logout } = useSession(); // Use useSession hook
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // const [isClient, setIsClient] = useState(false); // No longer needed as useSession handles client-side

  useEffect(() => {
    // setIsClient(true); // No longer needed
    if (!sessionLoading && user) {
      fetchNotifications();
    }
  }, [user, sessionLoading]); // Depend on user and sessionLoading

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/notifications/${id}`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    fetchNotifications(); // Refresh notifications
  };

  const handleLogout = () => {
    logout(); // Use the logout function from useSession
    router.push('/');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <Link href="/" className="navbar-brand">
          Sistema de Reservas
        </Link>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link href="/" className="nav-link">Inicio</Link>
            </li>
            <li className="nav-item">
              <Link href="/reservations" className="nav-link">Reservas</Link>
            </li>
            {!sessionLoading && user ? (
              <>
                {user.role === 'SUPERUSER' || user.role === 'ADMIN_RESERVATION' || user.role === 'ADMIN_RESOURCE' ? (
                  <li className="nav-item">
                    <Link href="/admin" className="nav-link">Admin</Link>
                  </li>
                ) : null}
                <li className="nav-item dropdown">
                  <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    Notificaciones {unreadCount > 0 && <span className="badge bg-danger">{unreadCount}</span>}
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end">
                    {notifications.length === 0 && <li className="dropdown-item">No hay notificaciones</li>}
                    {notifications.map(n => (
                      <li key={n.id}>
                        <a className={`dropdown-item ${n.read ? '' : 'fw-bold'}`} href="#" onClick={() => handleMarkAsRead(n.id)}>{n.message}</a>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="nav-item">
                  <Link href="/profile" className="nav-link">Perfil</Link>
                </li>
                <li className="nav-item">
                  <a href="#" className="nav-link" onClick={handleLogout}>Cerrar Sesión</a>
                </li>
              </>
            ) : !sessionLoading ? (
              <>
                <li className="nav-item">
                  <Link href="/login" className="nav-link">Iniciar Sesión</Link>
                </li>
                <li className="nav-item">
                  <Link href="/register" className="nav-link">Registrarse</Link>
                </li>
              </>
            ) : null}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;