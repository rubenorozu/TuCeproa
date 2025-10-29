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
          <th className="text-start" style={{ width: '240px' }}>ID Reserva</th>
          <th className="text-start" style={{ width: '480px' }}>Recurso</th>
          <th className="text-start" style={{ width: '480px' }}>Justificación</th>
          <th className="text-start" style={{ width: '120px' }}>Estado</th>
          <th className="text-start">Acciones</th>
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
                <td className="text-start text-truncate overflow-hidden" style={{ maxWidth: '240px' }}>{reservation.displayId}</td>
                <td className="text-start text-truncate overflow-hidden" style={{ maxWidth: '480px' }}>
                  {reservation.space?.name ||
                   reservation.equipment?.name ||
                   reservation.workshop?.name}
                </td>
                <td className="text-start text-truncate overflow-hidden" style={{ maxWidth: '480px' }}>{reservation.justification}</td>
                <td className="text-start text-nowrap" style={{ maxWidth: '120px' }}>{reservation.status}</td>
                <td className="text-start">
                  {reservation.status === 'PENDING' && (
                    <div className="d-inline-flex gap-2 flex-nowrap justify-content-start">
                      <Button variant="success" size="sm" onClick={() => handleApproveReject(reservation.id, 'approve')} disabled={!canApproveReject}>Aprobar</Button>
                      <Button variant="danger" size="sm" onClick={() => handleApproveReject(reservation.id, 'reject')} disabled={!canApproveReject}>Rechazar</Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
      </tbody>
    </Table>
  );
}
