'use client';

import { Button } from 'react-bootstrap';

interface ReservationFilterProps {
  filter: 'pending' | 'approved' | 'rejected' | 'all' | 'partially_approved';
  setFilter: (filter: 'pending' | 'approved' | 'rejected' | 'all' | 'partially_approved') => void;
  fetchReservations: (filter: 'pending' | 'approved' | 'rejected' | 'all' | 'partially_approved') => void;
}

export default function ReservationFilter({ filter, setFilter, fetchReservations }: ReservationFilterProps) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div>
        <Button variant={filter === 'pending' ? 'primary' : 'outline-primary'} onClick={() => setFilter('pending')} className="me-2">Pendientes</Button>
        <Button variant={filter === 'approved' ? 'success' : 'outline-success'} onClick={() => setFilter('approved')} className="me-2">Aprobadas</Button>
        <Button variant={filter === 'rejected' ? 'danger' : 'outline-danger'} onClick={() => setFilter('rejected')} className="me-2">Rechazadas</Button>
        <Button variant={filter === 'partially_approved' ? 'warning' : 'outline-warning'} onClick={() => setFilter('partially_approved')} className="me-2">Parciales</Button>
        <Button variant={filter === 'all' ? 'secondary' : 'outline-secondary'} onClick={() => setFilter('all')}>Todas</Button>
      </div>
      <Button variant="info" onClick={() => fetchReservations(filter)}>Refrescar</Button>
    </div>
  );
}
