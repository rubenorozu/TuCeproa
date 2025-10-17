'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Spinner, Alert, Container, Row, Col, Badge } from 'react-bootstrap';
import { useSession } from '@/context/SessionContext';
import Link from 'next/link';
import { InscriptionStatus } from '@prisma/client';

interface Inscription {
  id: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  workshop: { id: string; name: string; responsibleUserId?: string | null };
  status: InscriptionStatus;
  createdAt: string;
}

export default function AdminInscriptionsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);





  const [filter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const fetchInscriptions = useCallback(async (statusFilter: 'pending' | 'approved' | 'rejected' | 'all') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/inscriptions?status=${statusFilter}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar las inscripciones.');
      }
      const data: Inscription[] = await response.json();
      setInscriptions(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionLoading && user && (user.role === 'SUPERUSER' || user.role === 'ADMIN_RESERVATION' || user.role === 'ADMIN_RESOURCE')) {
      fetchInscriptions(filter);
    }
  }, [sessionLoading, user, filter, fetchInscriptions]);

  const handleApproveReject = async (inscriptionId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !window.confirm('¿Estás seguro de que quieres rechazar esta inscripción?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/inscriptions/${inscriptionId}/${action}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} la inscripción.`);
      }

      fetchInscriptions(filter); // Recargar la lista
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

  const handleDelete = async (inscriptionId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta inscripción? Esta acción es irreversible.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/inscriptions/${inscriptionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo eliminar la inscripción.');
      }

      alert('Inscripción eliminada correctamente.');
      fetchInscriptions(filter); // Recargar la lista
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        alert(`Error al eliminar: ${err.message}`);
      } else {
        setError('An unknown error occurred');
        alert('An unknown error occurred');
      }
    }
  };

  if (sessionLoading || (!user && !sessionLoading)) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando sesión...</p></Container>;
  }

  if (user.role !== 'SUPERUSER' && user.role !== 'ADMIN_RESERVATION' && user.role !== 'ADMIN_RESOURCE') {
    return <Alert variant="danger" className="mt-5">Acceso denegado. No tienes permisos de Superusuario.</Alert>;
  }

  const getStatusBadge = (status: InscriptionStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge bg="warning">Pendiente</Badge>;
      case 'APPROVED':
        return <Badge bg="success">Aprobada</Badge>;
      case 'REJECTED':
        return <Badge bg="danger">Rechazada</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <Container fluid style={{ paddingTop: '100px' }}>
      <Row className="mb-3 align-items-center">
        <Col>
          <h2>Gestión de Inscripciones a Talleres</h2>
        </Col>

      </Row>

      <div className="d-flex justify-content-end align-items-center mb-3">
        <Link href="/admin" passHref>
          <Button variant="outline-secondary" className="me-2">Regresar</Button>
        </Link>
        <Button variant="info" onClick={() => fetchInscriptions(filter)}>
          Refrescar
        </Button>
      </div>

      {loading && (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Taller</th>
              <th>Usuario</th>
              <th>Email</th>
              <th>Fecha de Solicitud</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {inscriptions.map(inscription => {
              const isResponsible = (user?.role === 'ADMIN_RESERVATION' || user?.role === 'ADMIN_RESOURCE') && inscription.workshop.responsibleUserId === user.id;
              const canApproveReject = user?.role === 'SUPERUSER' || isResponsible;

              return (
                <tr key={inscription.id}>
                  <td>{inscription.workshop.name}</td>
                  <td>{`${inscription.user.firstName} ${inscription.user.lastName}`}</td>
                  <td>{inscription.user.email}</td>
                  <td>{new Date(inscription.createdAt).toLocaleString()}</td>
                  <td>{getStatusBadge(inscription.status)}</td>
                  <td>
                    {inscription.status === 'PENDING' && (
                      <>
                        <Button variant="success" size="sm" className="me-2" onClick={() => handleApproveReject(inscription.id, 'approve')} disabled={!canApproveReject}>Aprobar</Button>
                        <Button variant="danger" size="sm" className="me-2" onClick={() => handleApproveReject(inscription.id, 'reject')} disabled={!canApproveReject}>Rechazar</Button>
                      </>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => handleDelete(inscription.id)} disabled={user?.role !== 'SUPERUSER' && !isResponsible}>Eliminar</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
