'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Spinner } from 'react-bootstrap';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import styles from './Header.module.css';

interface Notification {
  id: string;
  message: string;
  read: boolean;
}

const Header = () => {
  const router = useRouter();
  const { cart } = useCart();
  const { user, loading: sessionLoading, logout } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PUT' });
    fetchNotifications();
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="fixed-top bg-white shadow-sm">
      <nav className="navbar navbar-expand-lg navbar-light py-0 px-0">
        <div className="container-fluid px-0 px-md-3">
          <Link href="/" style={{ marginLeft: '-20px !important' }}> 
            <Image src="/assets/Ceproa.svg" alt="Ceproa" width={200} height={63} style={{ objectFit: 'contain' }} />
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#main-nav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse w-100 w-md-auto" id="main-nav"> {/* Added w-100 w-md-auto for stability */} 
            <ul className="navbar-nav ms-auto align-items-center" style={{ minWidth: '150px' }}> {/* Added minWidth for stability */} 
              <li className="nav-item"><Link href="/" className="nav-link">Inicio</Link></li>
              <li className="nav-item"><Link href="/recursos" className="nav-link">Recursos</Link></li>

              {sessionLoading ? (
                <li className="nav-item" key="loading-state"><span className="nav-link"><Spinner animation="border" size="sm" /></span></li>
              ) : user ? (
                <React.Fragment key="logged-in-state">
                  <li className="nav-item">
                    <Link href="/cart" className="nav-link">
                      Carrito <span className="badge rounded-pill bg-warning text-dark">{cart.length}</span>
                    </Link>
                  </li>
                  <li className="nav-item dropdown">
                    <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                    </a>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li><Link href="/profile" className="dropdown-item">Mi espacio</Link></li>
                      <li><Link href="/reservations" className="dropdown-item">Mis Reservas</Link></li>
                      <li><Link href="/my-workshops" className="dropdown-item">Mis Talleres</Link></li>
                      <li><Link href="/notifications" className="dropdown-item">Notificaciones {unreadCount > 0 && <span className="badge rounded-pill bg-danger">{unreadCount}</span>}</Link></li>
                      <li><hr className="dropdown-divider" /></li>
                      {(user.role === 'SUPERUSER' || user.role === 'ADMIN_RESERVATION' || user.role === 'ADMIN_RESOURCE') && (
                        <li><Link href="/admin" className="dropdown-item">Admin Dashboard</Link></li>
                      )}
                      {user.role === 'SUPERUSER' && (
                        <li><hr className="dropdown-divider" /></li>
                      )}
                      <li><a href="#" className="dropdown-item" onClick={handleLogout}>Logout</a></li>
                    </ul>
                  </li>
                </React.Fragment>
              ) : (
                <>
                  <li className="nav-item"><Link href="/login" className="nav-link">Login</Link></li>
                  <li className="nav-item">
                    <Link href="/register" className="btn btn-warning text-white" style={{backgroundColor: '#F28C00', borderColor: '#F28C00'}}>Registro</Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;