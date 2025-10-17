'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Reservation {
  id: string;
  spaceId?: string;
  equipmentId?: string;
  workshopId?: string;
  cartSubmissionId?: string; // New
  startTime: string;
  endTime: string;
  justification: string;
  subject?: string;
  coordinator?: string;
  teacher?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  space?: { name: string };
  equipment?: { name: string };
  workshop?: { name: string };
}

export default function UserReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserReservations = async () => {
      try {
        const res = await fetch('/api/user-reservations');

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch reservations');
        }

        const data: Reservation[] = await res.json();
        setReservations(data);
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

    fetchUserReservations();
  }, []);

  const getGroupStatus = (group: Reservation[]) => {
    const allApproved = group.every(r => r.status === 'APPROVED');
    const allRejected = group.every(r => r.status === 'REJECTED');
    const allPending = group.every(r => r.status === 'PENDING');

    if (allApproved) return 'APROBADA';
    if (allRejected) return 'RECHAZADA';
    if (allPending) return 'PENDIENTE';
    return 'PARCIALMENTE_APROBADA';
  };

  const groupedReservations = reservations.reduce((acc, reservation) => {
    const submissionId = reservation.cartSubmissionId || 'single-submission';
    if (!acc[submissionId]) {
      acc[submissionId] = [];
    }
    acc[submissionId].push(reservation);
    return acc;
  }, {} as Record<string, Reservation[]>);

  if (loading) {
    return <div className="container mt-5">Cargando tus reservas...</div>;
  }

  if (error) {
    return <div className="container mt-5 alert alert-danger">Error: {error}</div>;
  }

  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <h2 style={{ color: '#0076A8' }}>Mis Reservas</h2>
      <hr />
      {reservations.length === 0 ? (
        <div className="text-center">
          <p>No tienes reservas realizadas.</p>
          <Link href="/recursos" className="btn btn-primary" style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>Explorar Recursos</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedReservations).map(([submissionId, group]) => {
            const groupStatus = getGroupStatus(group);
            const statusColor = groupStatus === 'APROBADA' ? 'text-success' :
                                groupStatus === 'RECHAZADA' ? 'text-danger' :
                                groupStatus === 'PENDIENTE' ? 'text-warning' : 'text-info';
            return (
              <div key={submissionId} className="card shadow-sm">
                <div className="card-header" style={{ backgroundColor: '#0076A8', color: 'white' }}>
                  <h5 className="mb-0">Solicitud de Reserva ({submissionId === 'single-submission' ? 'Individual' : submissionId})</h5>
                  <span className={`badge bg-light ${statusColor}`}>{groupStatus}</span>
                </div>
                <ul className="list-group list-group-flush">
                  {group.map(reservation => (
                    <li key={reservation.id} className="list-group-item">
                      <div className="d-flex w-100 justify-content-between">
                        <div>
                          <h6 className="mb-1">
                            {reservation.space?.name || reservation.equipment?.name || reservation.workshop?.name}
                          </h6>
                          <small>Inicio: {new Date(reservation.startTime).toLocaleString()}</small><br/>
                          <small>Fin: {new Date(reservation.endTime).toLocaleString()}</small><br/>
                          <small>Justificación: {reservation.justification}</small>
                        </div>
                        <span className={`badge ${reservation.status === 'APPROVED' ? 'bg-success' : reservation.status === 'REJECTED' ? 'bg-danger' : 'bg-warning'}`}>
                          {reservation.status === 'APPROVED' ? 'Aprobada' : reservation.status === 'REJECTED' ? 'Rechazada' : 'Pendiente'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}