'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Spinner, Alert, Container, Row, Col, Badge, Form } from 'react-bootstrap';
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
  const [searchTerm, setSearchTerm] = useState(''); // Nuevo estado para el término de búsqueda

  const [filter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('all');

  const fetchInscriptions = useCallback(async (statusFilter: 'pending' | 'approved' | 'rejected' | 'all', searchQuery: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/inscriptions?status=${statusFilter}&search=${searchQuery}`);
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
      const handler = setTimeout(() => {
        fetchInscriptions(filter, searchTerm);
      }, 500); // Debounce por 500ms

      return () => {
        clearTimeout(handler);
      };
    }
  }, [sessionLoading, user, filter, searchTerm, fetchInscriptions]);

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
      {/* Mobile Layout */}
      <div className="d-block d-md-none">
        <Row className="mb-3">
          <Col xs={12} className="text-center">
            <h2>Gestión de Inscripciones a Talleres</h2>
          </Col>
          <Col xs={12} className="text-center mt-3">
            <Row className="g-0 mb-2">
              <Col xs={6} className="px-1">
                <Button variant="outline-secondary" onClick={() => fetchInscriptions(filter, searchTerm)} className="w-100" style={{ borderColor: '#1577a5', color: '#1577a5' }}>
                  Refrescar
                </Button>
              </Col>
              <Col xs={6} className="px-1">
                <Button variant="secondary" onClick={() => {
                  const link = document.createElement('a');
                  link.href = `/api/admin/inscriptions?status=${filter}&search=${searchTerm}&format=csv`;
                  link.setAttribute('download', 'Inscripciones_Talleres.csv');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }} className="w-100 text-nowrap overflow-hidden text-truncate">
                  Descargar CSV
                </Button>
              </Col>
            </Row>
            <div className="d-flex justify-content-end">
              <Link href="/admin" passHref>
                <Button variant="outline-secondary">Regresar</Button>
              </Link>
            </div>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col>
            <Form.Control
              type="text"
              placeholder="Buscar inscripciones por usuario, taller o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
        </Row>
      </div>

      {/* Desktop Layout */}
      <Row className="d-none d-md-flex align-items-center mb-3">
        <Col md={3} className="text-start">
          <h2>Gestión de Inscripciones a Talleres</h2>
        </Col>
        <Col md={9} className="text-end">
          <div className="d-flex justify-content-end gap-2">
            <Form.Control
              type="text"
              placeholder="Buscar inscripciones por usuario, taller o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 'auto' }} // Allow natural width
              className="me-2" // Add margin to the right of the search field
            />
            <Button variant="outline-secondary" onClick={() => fetchInscriptions(filter, searchTerm)}>
              Refrescar
            </Button>
            <Button variant="secondary" onClick={() => {
              const link = document.createElement('a');
              link.href = `/api/admin/inscriptions?status=${filter}&search=${searchTerm}&format=csv`;
              link.setAttribute('download', 'Inscripciones_Talleres.csv');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}>
              Descargar CSV
            </Button>
            <Link href="/admin" passHref>
              <Button variant="outline-secondary">Regresar</Button>
            </Link>
          </div>
        </Col>
      </Row>

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
