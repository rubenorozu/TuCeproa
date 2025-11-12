'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Spinner } from 'react-bootstrap';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import styles from './Header.module.css';

const Header = () => {
  const router = useRouter();
  const { cart } = useCart();
  const { user, loading: sessionLoading, logout, unreadCount } = useSession();
  const navbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Logic to close Bootstrap navbar on link click
    const navbarCollapse = document.getElementById('main-nav');
    if (navbarCollapse) {
          const navbarCollapse = document.getElementById('main-nav');
          if (navbarCollapse) {
            navbarCollapse.addEventListener('click', (event) => {
              const target = event.target as HTMLElement;
              // Check if the clicked element or its parent is a nav-link or dropdown-item
              if (
          (target.matches('.nav-link') && !target.hasAttribute('data-bs-toggle')) || // Regular nav-links (not dropdown toggles)
          target.matches('.dropdown-item') || // Dropdown items
          (target.closest('.nav-link') && !target.closest('.nav-link')?.hasAttribute('data-bs-toggle')) || // Child of regular nav-link
          target.closest('.dropdown-item') || // Child of dropdown item
          target.matches('.btn') || // Check if the clicked element is a button
          target.closest('.btn') // Check if the clicked element is inside a button
        ) {
                const navbarToggler = document.querySelector('.navbar-toggler');
                if (navbarToggler) {
                  (navbarToggler as HTMLElement).click(); // Simulate a click on the toggler button
                }
              }
            });
          }    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
        const navbarToggler = document.querySelector('.navbar-toggler');
        if (navbarToggler && navbarToggler.getAttribute('aria-expanded') === 'true') {
          (navbarToggler as HTMLElement).click();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    // Add logic to close the navbar
    const navbarToggler = document.querySelector('.navbar-toggler');
    if (navbarToggler && navbarToggler.getAttribute('aria-expanded') === 'true') {
      (navbarToggler as HTMLElement).click();
    }
  };

  return (
    <header className="fixed-top bg-white shadow-sm">
      <nav className="navbar navbar-expand-lg navbar-light py-0 px-0">
        <div className="container-fluid px-0 pe-3 px-md-3">
          <Link href="/" style={{ marginLeft: '-20px !important' }}> 
            <Image src="/assets/Ceproa.svg" alt="Ceproa" width={200} height={63} style={{ objectFit: 'contain' }} />
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#main-nav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse w-100 w-md-auto" id="main-nav" ref={navbarRef}> {/* Added w-100 w-md-auto for stability */} 
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
                      {unreadCount > 0 && <span className="badge rounded-pill bg-danger ms-2">{unreadCount}</span>}
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
                      {(user.role === 'SUPERUSER' || user.role === 'VIGILANCIA') && (
                        <li><Link href="/vigilancia/dashboard" className="dropdown-item">Dashboard Vigilancia</Link></li>
                      )}
                      {user.role === 'CALENDAR_VIEWER' && (
                        <li><Link href="/admin/calendars" className="dropdown-item">Ver Calendario</Link></li>
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
