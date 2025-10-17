'use client';

import { Table, Button } from 'react-bootstrap';
import { ReservationItem } from './types';
import { Role } from '@prisma/client'; // Import Role enum

interface UserSession {
  id: string;
  role: string;
  name?: string | null;
  email: string;
}

interface ReservationTableProps {
  items: ReservationItem[];
  filter: 'pending' | 'approved' | 'rejected' | 'all' | 'partially_approved';
  handleApproveReject: (reservationId: string, action: 'approve' | 'reject') => void;
  currentUser: UserSession | null;
}

export default function ReservationTable({ items, filter, handleApproveReject, currentUser }: ReservationTableProps) {
  return (
    <Table striped bordered hover responsive size="sm" className="mb-0">
      <thead>
        <tr>
          <th>ID Reserva</th>
          <th>Recurso</th>
          <th>Justificación</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {items
          .filter(item => filter !== 'pending' || item.status === 'PENDING')
          .map(reservation => {
            const isResponsible = (currentUser?.role === Role.ADMIN_RESERVATION || currentUser?.role === Role.ADMIN_RESOURCE) &&
              (reservation.space?.responsibleUserId === currentUser.id ||
               reservation.equipment?.responsibleUserId === currentUser.id);
            const canApproveReject = currentUser?.role === Role.SUPERUSER || isResponsible;

            return (
              <tr key={reservation.id}>
                <td>{reservation.displayId}</td>
                <td>
                  {reservation.space?.name ||
                   reservation.equipment?.name ||
                   reservation.workshop?.name}
                </td>
                <td>{reservation.justification}</td>
                <td>{reservation.status}</td>
                <td>
                  {reservation.status === 'PENDING' && (
                    <>
                      <Button variant="success" size="sm" className="me-2" onClick={() => handleApproveReject(reservation.id, 'approve')} disabled={!canApproveReject}>Aprobar</Button>
                      <Button variant="danger" size="sm" className="me-2" onClick={() => handleApproveReject(reservation.id, 'reject')} disabled={!canApproveReject}>Rechazar</Button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
      </tbody>
    </Table>
  );
}
