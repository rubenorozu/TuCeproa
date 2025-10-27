'use client';

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, ButtonGroup } from 'react-bootstrap';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from '@/context/SessionContext';
import { Role } from '@prisma/client';
import { GroupedReservation } from '@/components/admin/reservations/types';
import ReservationCard from '@/components/admin/reservations/ReservationCard';

export default function AdminDashboardPage() {
  const { user, loading: sessionLoading } = useSession();
  console.log('DEBUG AdminDashboardPage: user:', user);
  console.log('DEBUG AdminDashboardPage: user.role:', user?.role);

  const [groupedReservations, setGroupedReservations] = useState<GroupedReservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all' | 'partially_approved'>('pending');

  const fetchReservations = async (statusFilter: 'pending' | 'approved' | 'rejected' | 'all' | 'partially_approved') => {
    setLoadingReservations(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reservations?status=${statusFilter}`);
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
    if (!sessionLoading && user && (user.role === Role.SUPERUSER || user.role === Role.ADMIN_RESERVATION || user.role === Role.ADMIN_RESOURCE)) {
      fetchReservations(filter);
    }
  }, [sessionLoading, user, filter]);

  const handleApproveReject = useCallback(
    async (reservationId: string, action: 'approve' | 'reject') => {
      if (action === 'reject' && !window.confirm(`¿Estás seguro de que quieres rechazar esta reservación?`)) {
        return;
      }

      try {
        const response = await fetch(`/api/admin/reservations/${reservationId}/${action}`, {
          method: 'POST',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} la reservación.`);
        }

        fetchReservations(filter);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
          alert(`Error: ${err.message}`);
        } else {
          setError('An unknown error occurred');
          alert('An unknown error occurred');
        }
      }
    },
    [filter]
  );

  const cardImages = {
    users: '/images/admin-cards/Usuarios.jpg',
    spaces: '/images/admin-cards/Espacios.jpg',
    equipment: '/images/admin-cards/Equipos.jpg',
    workshops: '/images/admin-cards/Talleres.jpg',
    inscriptions: '/images/admin-cards/Inscripciones.jpg',
    reservations: '/placeholder.svg',
    settings: '/images/admin-cards/Config.png',
  };

  if (sessionLoading || (!user && !sessionLoading)) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
        <p>Cargando sesión...</p>
      </Container>
    );
  }

  if (user.role !== Role.SUPERUSER && user.role !== Role.ADMIN_RESERVATION && user.role !== Role.ADMIN_RESOURCE) {
    return (
      <Alert variant="danger" className="mt-5">
        Acceso denegado. No tienes permisos de Superusuario o Administrador de Reservas.
      </Alert>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Dashboard de Administración</h2>
          <br />
          <p className="mb-4">Bienvenido, {user.email}. Aquí puedes gestionar la plataforma.</p>
        </Col>
      </Row>

            {user.role === Role.SUPERUSER ? (
              <>
                <Row className="mb-4 admin-card-row">
                  <Col>
                    <Card className="h-100">
                      <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: 'white' }}>
                        <Image src={cardImages.users} alt="Usuarios" fill style={{ objectFit: 'contain' }} />
                      </div>
                      <Card.Body className="d-flex flex-column text-center">
                        <Card.Title>Usuarios</Card.Title>
                        <Card.Text className="flex-grow-1">Gestionar cuentas de usuario.</Card.Text>
                        <Link href="/admin/users" className="btn btn-primary mt-auto" style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>
                          Ir a Usuarios
                        </Link>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col>
                    <Card className="h-100">
                      <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: 'white' }}>
                        <Image src={cardImages.spaces} alt="Espacios" fill style={{ objectFit: 'contain' }} />
                      </div>
                      <Card.Body className="d-flex flex-column text-center">
                        <Card.Title>Espacios</Card.Title>
                        <Card.Text className="flex-grow-1">Gestionar espacios físicos.</Card.Text>
                        <Link href="/admin/spaces" className="btn btn-primary mt-auto" style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>
                          Ir a Espacios
                        </Link>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col>
                    <Card className="h-100">
                      <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: 'white' }}>
                        <Image src={cardImages.equipment} alt="Equipos" fill style={{ objectFit: 'contain' }} />
                      </div>
                      <Card.Body className="d-flex flex-column text-center">
                        <Card.Title>Equipos</Card.Title>
                        <Card.Text className="flex-grow-1">Gestionar equipos disponibles.</Card.Text>
                        <Link href="/admin/equipment" className="btn btn-primary mt-auto" style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>
                          Ir a Equipos
                        </Link>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col>
                    <Card className="h-100">
                      <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: 'white' }}>
                        <Image src={cardImages.workshops} alt="Talleres" fill style={{ objectFit: 'contain' }} />
                      </div>
                      <Card.Body className="d-flex flex-column text-center">
                        <Card.Title>Talleres</Card.Title>
                        <Card.Text className="flex-grow-1">Gestionar talleres y eventos.</Card.Text>
                        <Link href="/admin/workshops" className="btn btn-primary mt-auto" style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>
                          Ir a Talleres
                        </Link>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col>
                    <Card className="h-100">
                      <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: 'white' }}>
                        <Image src={cardImages.inscriptions} alt="Inscripciones" fill style={{ objectFit: 'contain' }} />
                      </div>
                      <Card.Body className="d-flex flex-column text-center">
                        <Card.Title>Inscripciones</Card.Title>
                        <Card.Text className="flex-grow-1">Gestionar inscripciones a talleres.</Card.Text>
                        <Link href="/admin/inscriptions" className="btn btn-primary mt-auto" style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>
                          Ir a Inscripciones
                        </Link>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col>
                    <Card className="h-100">
                      <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: 'white' }}>
                        <Image src={cardImages.settings} alt="Configuración" fill style={{ objectFit: 'contain' }} />
                      </div>
                      <Card.Body className="d-flex flex-column text-center">
                        <Card.Title>Configuración</Card.Title>
                        <Card.Text className="flex-grow-1">Gestionar configuración del sistema.</Card.Text>
                        <Link href="/admin/settings" className="btn btn-primary mt-auto" style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>
                          Ir a Configuración
                        </Link>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
      
                <Row className="mb-4">
                  <Col>
                    <h3>Reservaciones</h3>
                    {/* Mobile Layout */}
                    <div className="d-block d-md-none mb-3">
                      <Row className="g-2 mb-2">
                        <Col xs={4}>
                          <Button
                            variant={filter === 'pending' ? 'primary' : 'outline-primary'}
                            onClick={() => setFilter('pending')}
                            className="w-100"
                          >
                            Pendientes
                          </Button>
                        </Col>
                        <Col xs={4}>
                          <Button
                            variant={filter === 'approved' ? 'success' : 'outline-success'}
                            onClick={() => setFilter('approved')}
                            className="w-100"
                          >
                            Aprobadas
                          </Button>
                        </Col>
                        <Col xs={4}>
                          <Button
                            variant={filter === 'rejected' ? 'danger' : 'outline-danger'}
                            onClick={() => setFilter('rejected')}
                            className="w-100"
                          >
                            Rechazadas
                          </Button>
                        </Col>
                      </Row>
                      <Row className="g-2">
                        <Col xs={4}>
                          <Button
                            variant={filter === 'partially_approved' ? 'warning' : 'outline-warning'}
                            onClick={() => setFilter('partially_approved')}
                            className="w-100"
                          >
                            Parciales
                          </Button>
                        </Col>
                        <Col xs={4}>
                          <Button
                            variant={filter === 'all' ? 'secondary' : 'outline-secondary'}
                            onClick={() => setFilter('all')}
                            className="w-100"
                          >
                            Todas
                          </Button>
                        </Col>
                        <Col xs={4}>
                          <Button variant="info" onClick={() => fetchReservations(filter)} className="w-100">
                            Refrescar
                          </Button>
                        </Col>
                      </Row>
                    </div>

                    {/* Desktop Layout */}
                    <div className="d-none d-md-flex justify-content-start gap-2 mb-3">
                      <Button
                        variant={filter === 'pending' ? 'primary' : 'outline-primary'}
                        onClick={() => setFilter('pending')}
                      >
                        Pendientes
                      </Button>
                      <Button
                        variant={filter === 'approved' ? 'success' : 'outline-success'}
                        onClick={() => setFilter('approved')}
                      >
                        Aprobadas
                      </Button>
                      <Button
                        variant={filter === 'rejected' ? 'danger' : 'outline-danger'}
                        onClick={() => setFilter('rejected')}
                      >
                        Rechazadas
                      </Button>
                      <Button
                        variant={filter === 'partially_approved' ? 'warning' : 'outline-warning'}
                        onClick={() => setFilter('partially_approved')}
                      >
                        Parciales
                      </Button>
                      <Button
                        variant={filter === 'all' ? 'secondary' : 'outline-secondary'}
                        onClick={() => setFilter('all')}
                      >
                        Todas
                      </Button>
                      <Button variant="info" onClick={() => fetchReservations(filter)}>
                        Refrescar
                      </Button>
                    </div>
      
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
                        <Alert variant="info">
                          No hay reservaciones{' '}
                          {filter === 'all'
                            ? ''
                            : filter === 'pending'
                            ? 'pendientes'
                            : filter === 'approved'
                            ? 'aprobadas'
                            : filter === 'rejected'
                            ? 'rechazadas'
                            : 'parciales'}
                          .
                        </Alert>
                      ) : (
                        groupedReservations
                          .filter(group => group.items && group.items.length > 0)
                          .map(group => (
                            <ReservationCard
                              key={group.cartSubmissionId}
                              group={group}
                              filter={filter}
                              handleApproveReject={handleApproveReject}
                              currentUser={user}
                            />
                          ))
                      )
                    )}
                  </Col>
                </Row>
              </>
            ) : user.role === Role.ADMIN_RESOURCE ? (
                      <>
                        <Row className="mb-4 admin-card-row">
                          <Col>
                            <Card className="h-100">
                              <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: 'white' }}>
                                <Image src={cardImages.spaces} alt="Espacios" fill style={{ objectFit: 'contain' }} />
                              </div>
                              <Card.Body className="d-flex flex-column text-center">
                                <Card.Title>Espacios</Card.Title>
                                <Card.Text className="flex-grow-1">Gestionar espacios físicos.</Card.Text>
                                <Link href="/admin/spaces" className="btn btn-primary mt-auto">
                                  Ir a Espacios
                                </Link>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col>
                            <Card className="h-100">
                              <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: 'white' }}>
                                <Image src={cardImages.equipment} alt="Equipos" fill style={{ objectFit: 'contain' }} />
                              </div>
                              <Card.Body className="d-flex flex-column text-center">
                                <Card.Title>Equipos</Card.Title>
                                <Card.Text className="flex-grow-1">Gestionar equipos disponibles.</Card.Text>
                                <Link href="/admin/equipment" className="btn btn-primary mt-auto">
                                  Ir a Equipos
                                </Link>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col>
                            <Card className="h-100">
                              <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: 'white' }}>
                                <Image src={cardImages.workshops} alt="Talleres" fill style={{ objectFit: 'contain' }} />
                              </div>
                              <Card.Body className="d-flex flex-column text-center">
                                <Card.Title>Talleres</Card.Title>
                                <Card.Text className="flex-grow-1">Gestionar talleres y eventos.</Card.Text>
                                <Link href="/admin/workshops" className="btn btn-primary mt-auto">
                                  Ir a Talleres
                                </Link>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col>
                            <Card className="h-100">
                              <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: 'white' }}>
                                <Image src={cardImages.inscriptions} alt="Inscripciones" fill style={{ objectFit: 'contain' }} />
                              </div>
                              <Card.Body className="d-flex flex-column text-center">
                                <Card.Title>Inscripciones</Card.Title>
                                <Card.Text className="flex-grow-1">Gestionar inscripciones a talleres.</Card.Text>
                                <Link href="/admin/inscriptions" className="btn btn-primary mt-auto">
                                  Ir a Inscripciones
                                </Link>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>
                        <Row className="mb-4">
                          <Col>
                            <h3>Reservaciones</h3>
                            {/* Mobile Layout */}
                            <div className="d-block d-md-none mb-3">
                              <Row className="g-2 mb-2">
                                <Col xs={4}>
                                  <Button
                                    variant={filter === 'pending' ? 'primary' : 'outline-primary'}
                                    onClick={() => setFilter('pending')}
                                    className="w-100"
                                  >
                                    Pendientes
                                  </Button>
                                </Col>
                                <Col xs={4}>
                                  <Button
                                    variant={filter === 'approved' ? 'success' : 'outline-success'}
                                    onClick={() => setFilter('approved')}
                                    className="w-100"
                                  >
                                    Aprobadas
                                  </Button>
                                </Col>
                                <Col xs={4}>
                                  <Button
                                    variant={filter === 'rejected' ? 'danger' : 'outline-danger'}
                                    onClick={() => setFilter('rejected')}
                                    className="w-100"
                                  >
                                    Rechazadas
                                  </Button>
                                </Col>
                              </Row>
                              <Row className="g-2">
                                <Col xs={4}>
                                  <Button
                                    variant={filter === 'partially_approved' ? 'warning' : 'outline-warning'}
                                    onClick={() => setFilter('partially_approved')}
                                    className="w-100"
                                  >
                                    Parciales
                                  </Button>
                                </Col>
                                <Col xs={4}>
                                  <Button
                                    variant={filter === 'all' ? 'secondary' : 'outline-secondary'}
                                    onClick={() => setFilter('all')}
                                    className="w-100"
                                  >
                                    Todas
                                  </Button>
                                </Col>
                                <Col xs={4}>
                                  <Button variant="info" onClick={() => fetchReservations(filter)} className="w-100">
                                    Refrescar
                                  </Button>
                                </Col>
                              </Row>
                            </div>

                            {/* Desktop Layout */}
                            <div className="d-none d-md-flex justify-content-start gap-2 mb-3">
                              <Button
                                variant={filter === 'pending' ? 'primary' : 'outline-primary'}
                                onClick={() => setFilter('pending')}
                              >
                                Pendientes
                              </Button>
                              <Button
                                variant={filter === 'approved' ? 'success' : 'outline-success'}
                                onClick={() => setFilter('approved')}
                              >
                                Aprobadas
                              </Button>
                              <Button
                                variant={filter === 'rejected' ? 'danger' : 'outline-danger'}
                                onClick={() => setFilter('rejected')}
                              >
                                Rechazadas
                              </Button>
                              <Button
                                variant={filter === 'partially_approved' ? 'warning' : 'outline-warning'}
                                onClick={() => setFilter('partially_approved')}
                              >
                                Parciales
                              </Button>
                              <Button
                                variant={filter === 'all' ? 'secondary' : 'outline-secondary'}
                                onClick={() => setFilter('all')}
                              >
                                Todas
                              </Button>
                              <Button variant="info" onClick={() => fetchReservations(filter)}>
                                Refrescar
                              </Button>
                            </div>
              
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
                                <Alert variant="info">
                                  No hay reservaciones{' '}
                                  {filter === 'all'
                                    ? ''
                                    : filter === 'pending'
                                    ? 'pendientes'
                                    : filter === 'approved'
                                    ? 'aprobadas'
                                    : filter === 'rejected'
                                    ? 'rechazadas'
                                    : 'parciales'}
                                  .
                                </Alert>
                              ) : (
                                groupedReservations
                                  .filter(group => group.items && group.items.length > 0)
                                  .map(group => (
                                    <ReservationCard
                                      key={group.cartSubmissionId}
                                      group={group}
                                      filter={filter}
                                      handleApproveReject={handleApproveReject}
                                      currentUser={user}
                                    />
                                  ))
                              )
                            )}
                          </Col>
                        </Row>
                      </>            ) : (
              <Row>
                          <Col md={2}>
                            <Card>
                              <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: 'white' }}>                      <Image src={cardImages.inscriptions} alt="Inscripciones" fill style={{ objectFit: 'contain' }} />
                    </div>
                    <Card.Body className="d-flex flex-column text-center">
                      <Card.Title>Inscripciones</Card.Title>
                      <Card.Text className="flex-grow-1">Gestionar inscripciones a talleres.</Card.Text>
                      <Link href="/admin/inscriptions" className="btn btn-primary mt-auto">
                        Ir a Inscripciones
                      </Link>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={10}>
                  <h3>Reservaciones</h3>
                    {/* Mobile Layout */}
                    <div className="d-block d-md-none mb-3">
                      <Row className="g-2 mb-2">
                        <Col xs={4}>
                          <Button
                            variant={filter === 'pending' ? 'primary' : 'outline-primary'}
                            onClick={() => setFilter('pending')}
                            className="w-100"
                          >
                            Pendientes
                          </Button>
                        </Col>
                        <Col xs={4}>
                          <Button
                            variant={filter === 'approved' ? 'success' : 'outline-success'}
                            onClick={() => setFilter('approved')}
                            className="w-100"
                          >
                            Aprobadas
                          </Button>
                        </Col>
                        <Col xs={4}>
                          <Button
                            variant={filter === 'rejected' ? 'danger' : 'outline-danger'}
                            onClick={() => setFilter('rejected')}
                            className="w-100"
                          >
                            Rechazadas
                          </Button>
                        </Col>
                      </Row>
                      <Row className="g-2">
                        <Col xs={4}>
                                                        <Button
                                                          variant={filter === 'partially_approved' ? 'warning' : 'outline-warning'}
                                                          onClick={() => setFilter('partially_approved')}
                                                          className="w-100"
                                                        >
                                                          Parciales
                                                        </Button>                        </Col>
                        <Col xs={4}>
                          <Button
                            variant={filter === 'all' ? 'secondary' : 'outline-secondary'}
                            onClick={() => setFilter('all')}
                            className="w-100"
                          >
                            Todas
                          </Button>
                        </Col>
                        <Col xs={4}>
                          <Button variant="info" onClick={() => fetchReservations(filter)} className="w-100">
                            Refrescar
                          </Button>
                        </Col>
                      </Row>
                    </div>

                    {/* Desktop Layout */}
                    <div className="d-none d-md-flex justify-content-start gap-2 mb-3">
                      <Button
                        variant={filter === 'pending' ? 'primary' : 'outline-primary'}
                        onClick={() => setFilter('pending')}
                      >
                        Pendientes
                      </Button>
                      <Button
                        variant={filter === 'approved' ? 'success' : 'outline-success'}
                        onClick={() => setFilter('approved')}
                      >
                        Aprobadas
                      </Button>
                      <Button
                        variant={filter === 'rejected' ? 'danger' : 'outline-danger'}
                        onClick={() => setFilter('rejected')}
                      >
                        Rechazadas
                      </Button>
                      <Button
                        variant={filter === 'partially_approved' ? 'warning' : 'outline-warning'}
                        onClick={() => setFilter('partially_approved')}
                      >
                        Parciales
                      </Button>
                      <Button
                        variant={filter === 'all' ? 'secondary' : 'outline-secondary'}
                        onClick={() => setFilter('all')}
                      >
                        Todas
                      </Button>
                      <Button variant="info" onClick={() => fetchReservations(filter)}>
                        Refrescar
                      </Button>
                    </div>
      
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
                      <Alert variant="info">
                        No hay reservaciones{' '}
                        {filter === 'all'
                          ? ''
                          : filter === 'pending'
                          ? 'pendientes'
                          : filter === 'approved'
                          ? 'aprobadas'
                          : filter === 'rejected'
                          ? 'rechazadas'
                          : 'parciales'}
                        .
                      </Alert>
                    ) : (
                      groupedReservations
                        .filter(group => group.items && group.items.length > 0)
                        .map(group => (
                            <ReservationCard
                              key={group.cartSubmissionId}
                              group={group}
                              filter={filter}
                              handleApproveReject={handleApproveReject}
                              currentUser={user}
                            />
                          ))
                      )
                    )}
                  </Col>
                </Row>
            )}    </Container>
  );
}
