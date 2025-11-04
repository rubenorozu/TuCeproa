'use client';

import UserCalendar from '@/components/reservations/UserCalendar';

export default function UserReservationsPage() {
  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <h2 style={{ color: '#0076A8' }}>Mis Reservas</h2>
      <hr />
      <UserCalendar />
    </div>
  );
}