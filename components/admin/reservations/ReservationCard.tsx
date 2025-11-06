'use client';

import { Card } from 'react-bootstrap';
import ReservationTable from './ReservationTable';
import { GroupedReservation } from './types';

interface UserSession {
  id: string;
  role: string;
  name?: string | null;
  email: string;
}

interface ReservationCardProps {
  group: GroupedReservation;
  filter: 'pending' | 'approved' | 'rejected' | 'all' | 'partially_approved';
  handleApproveReject: (reservationId: string, action: 'approve' | 'reject') => void;
  currentUser: UserSession | null; // Add currentUser prop
}

export default function ReservationCard({ group, filter, handleApproveReject, currentUser }: ReservationCardProps) {
  return (
    <Card key={group.cartSubmissionId} className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center bg-light">
        <div>
          <strong>Solicitud ID:</strong> {group.items[0].displayId || group.cartSubmissionId}
          <span className={`ms-3 badge bg-${group.overallStatus === 'APPROVED' ? 'success' : group.overallStatus === 'REJECTED' ? 'danger' : group.overallStatus === 'PARTIALLY_APPROVED' ? 'warning' : 'info'}`}>
            {{
              'APPROVED': 'Aprobada',
              'REJECTED': 'Rechazada',
              'PENDING': 'Pendiente',
              'PARTIALLY_APPROVED': 'Parcialmente Aprobada'
            }[group.overallStatus] || group.overallStatus}
          </span>
        </div>
        <div>
          <strong>Usuario:</strong> {group.items[0].user.name || group.items[0].user.email}
          <span className="ms-3">Inicio: {new Date(group.items[0].startTime).toLocaleString()}</span>
          <span className="ms-3">Fin: {new Date(group.items[0].endTime).toLocaleString()}</span>
          {/* Add Generar Hoja de Salida button here if group contains approved equipment */}
          {group.items.some(item => (item.status === 'APPROVED' || item.status === 'PARTIALLY_APPROVED') && item.equipment) && (
                                <a href={`/api/admin/reservations/${group.cartSubmissionId}/exit-sheet`} className="btn btn-info btn-sm ms-3" target="_blank" download={`hoja_salida_${group.items[0].displayId}.pdf`}>              Generar Hoja de Salida
            </a>
          )}
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <ReservationTable items={group.items} filter={filter} handleApproveReject={handleApproveReject} currentUser={currentUser} />
      </Card.Body>
    </Card>
  );
}
