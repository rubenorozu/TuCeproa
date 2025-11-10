'use client';

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Spinner, Alert, Modal, Form, Button } from 'react-bootstrap';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { GroupedReservation } from '@/components/admin/reservations/types';
import ReservationFilter from '@/components/admin/reservations/ReservationFilter';
import ReservationCard from '@/components/admin/reservations/ReservationCard';

export default function ReservationsManagerPage() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [groupedReservations, setGroupedReservations] = useState<GroupedReservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all' | 'partially_approved'>('pending');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionReservationId, setRejectionReservationId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && (!user || (user.role !== 'SUPERUSER' && user.role !== 'ADMIN_RESERVATION'))) {
      router.push('/'); // Redirigir si no es superusuario ni admin de reservas
    }
  }, [user, sessionLoading, router]);

  const fetchReservations = async (statusFilter: 'pending' | 'approved' | 'rejected' | 'all' | 'partially_approved') => {
    setLoadingReservations(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reservations?status=${statusFilter}`, { cache: 'no-store' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar las reservaciones.');
      }
      const data: GroupedReservation[] = await response.json();
      setGroupedReservations(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoadingReservations(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading && user && (user.role === 'SUPERUSER' || user.role === 'ADMIN_RESERVATION')) {
      fetchReservations(filter);
    }
  }, [sessionLoading, user, filter]);

  const handleApproveReject = useCallback(async (reservationId: string, action: 'approve' | 'reject') => {
    if (action === 'reject') {
      setRejectionReservationId(reservationId);
      setShowRejectionModal(true);
    } else {
      try {
        const response = await fetch(`/api/admin/reservations/${reservationId}/${action}`, {
          method: 'POST',
        });

        if (!response.ok) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} la reservación.`);
          } catch (jsonError) {
            throw new Error(response.statusText);
          }
        }

        fetchReservations(filter); // Recargar la lista con el filtro actual
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
          alert(`Error: ${err.message}`);
        } else {
          setError('An unknown error occurred');
          alert('An unknown error occurred');
        }
      }
    }
  }, [filter]);

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
      fetchReservations(filter); // Recargar la lista con el filtro actual
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        alert(`Error: ${err.message}`);
      } else {
        setError('An unknown error occurred');
        alert('An unknown error occurred');
      }
    }
  };

  if (sessionLoading || !user) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando sesión...</p></Container>;
  }

  if (user.role !== 'SUPERUSER' && user.role !== 'ADMIN_RESERVATION') {
    return <Alert variant="danger" className="mt-5">Acceso denegado. No tienes permisos para gestionar reservaciones.</Alert>;
  }

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Gestión de Reservaciones</h2>
          <p>Bienvenido, {user.email}. Aquí puedes gestionar las reservaciones.</p>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <ReservationFilter filter={filter} setFilter={setFilter} fetchReservations={fetchReservations} />

          {loadingReservations && (
            <div className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </Spinner>
            </div>
          )}

          {error && <Alert variant="danger">{error}</Alert>}

          {!loadingReservations && !error && (
            groupedReservations.length === 0 ? (
              <Alert variant="info">No hay reservaciones {filter === 'all' ? '' : filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : filter === 'rejected' ? 'rechazadas' : 'parciales'}.</Alert>
            ) : (
              groupedReservations
                .filter(group => group.items && group.items.length > 0)
                .map(group => {
                  return (
                  <ReservationCard key={group.cartSubmissionId} group={group} filter={filter} handleApproveReject={handleApproveReject} currentUser={user} />
                  );
              })
            )
          )}
        </Col>
      </Row>

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
    </Container>
  );
}
