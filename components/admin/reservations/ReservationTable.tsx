'use client';

import { Table, Button, Modal, Form } from 'react-bootstrap';
import { ReservationItem } from './types';
import { Role } from '@prisma/client'; // Import Role enum
import { useState } from 'react';

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
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionReservationId, setRejectionReservationId] = useState<string | null>(null);

  const handleRejectClick = (reservationId: string) => {
    setRejectionReservationId(reservationId);
    setShowRejectionModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReservationId) return;

    try {
      const response = await fetch(`/api/admin/reservations/${rejectionReservationId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejectionReason }),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al rechazar la reservación.');
        } catch (jsonError) {
          throw new Error(response.statusText);
        }
      }

      setShowRejectionModal(false);
      setRejectionReason('');
      // We need to refetch the reservations, but we don't have the fetch function here.
      // We will rely on the parent component to do this.
      window.location.reload(); // Temporary solution
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error: ${err.message}`);
      } else {
        alert('An unknown error occurred');
      }
    }
  };

  return (
    <>
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

              console.log(`DEBUG: Reservation ID: ${reservation.id}, Status: ${reservation.status}, Has Equipment: ${!!reservation.equipment}, Is Approved/Partially Approved: ${reservation.status === 'APPROVED' || reservation.status === 'PARTIALLY_APPROVED'}`);

              return (
                <tr key={reservation.id}>
                  <td className="text-start text-truncate overflow-hidden" style={{ maxWidth: '240px' }}>{reservation.displayId}</td>
                  <td className="text-start text-truncate overflow-hidden" style={{ maxWidth: '480px' }}>
                    {reservation.space?.name ||
                     (reservation.equipment?.name && reservation.equipment.space?.name ? `${reservation.equipment.name} (en ${reservation.equipment.space.name})` : reservation.equipment?.name) ||
                     reservation.workshop?.name}
                  </td>
                  <td className="text-start text-truncate overflow-hidden" style={{ maxWidth: '480px' }}>{reservation.justification}</td>
                  <td className="text-start text-nowrap" style={{ maxWidth: '120px' }}>{reservation.status}</td>
                  <td className="text-start">
                    {reservation.status === 'PENDING' && (
                      <div className="d-inline-flex gap-2 flex-nowrap justify-content-start">
                        <Button variant="success" size="sm" onClick={() => handleApproveReject(reservation.id, 'approve')} disabled={!canApproveReject}>Aprobar</Button>
                        <Button variant="danger" size="sm" onClick={() => handleRejectClick(reservation.id)} disabled={!canApproveReject}>Rechazar</Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </Table>

      <Modal show={showRejectionModal} onHide={() => setShowRejectionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Rechazar Reservación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Motivo del Rechazo</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectionModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleRejectSubmit}>
            Rechazar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
