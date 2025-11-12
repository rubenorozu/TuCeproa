'use client';

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, ButtonGroup, Form } from 'react-bootstrap';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from '@/context/SessionContext';
import { Role } from '@prisma/client';
import { GroupedReservation } from '@/components/admin/reservations/types';
import ReservationCard from '@/components/admin/reservations/ReservationCard';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();


  const [groupedReservations, setGroupedReservations] = useState<GroupedReservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all' | 'partially_approved'>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 10; // Define a fixed page size for now

  const fetchReservations = async (statusFilter: 'pending' | 'approved' | 'rejected' | 'all' | 'partially_approved', page: number = 1, searchQuery: string = '') => {
    setLoadingReservations(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reservations?status=${statusFilter}&page=${page}&pageSize=${pageSize}&search=${searchQuery}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar las reservaciones.');
      }
      const result = await response.json(); // API now returns { data, pagination }
      setGroupedReservations(result.data);
      setTotalPages(result.pagination.pageCount);
      setTotalItems(result.pagination.total);
      setCurrentPage(result.pagination.page);
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
    if (!sessionLoading && user?.role === Role.CALENDAR_VIEWER) {
      router.push('/admin/calendars');
    }
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (!sessionLoading && user && (user.role === Role.SUPERUSER || user.role === Role.ADMIN_RESERVATION || user.role === Role.ADMIN_RESOURCE)) {
      const handler = setTimeout(() => {
        fetchReservations(filter, currentPage, searchTerm);
      }, 500); // Debounce for 500ms

      return () => {
        clearTimeout(handler);
      };
    }
  }, [sessionLoading, user, filter, currentPage, searchTerm]);

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
    calendars: '/images/admin-cards/Calendarios.jpg', // New unified calendar card
    reservations: '/placeholder.svg',
    settings: '/images/admin-cards/Config.png',
    reports: '/images/admin-cards/Reportes.jpg', // NEW: Reports image
    recurringBlocks: '/images/admin-cards/RecurringBlocks.png', // NEW: Recurring Blocks image
  };

  if (sessionLoading || !user || user.role === Role.CALENDAR_VIEWER) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
        <p>Cargando...</p>
      </Container>
    );
  }

  const allowedRoles: Role[] = [Role.SUPERUSER, Role.ADMIN_RESERVATION, Role.ADMIN_RESOURCE, Role.CALENDAR_VIEWER];
  if (!allowedRoles.includes(user.role)) {
    return (
      <Alert variant="danger" className="mt-5">
        Acceso denegado. No tienes permisos para ver esta página.
      </Alert>
    );
  }

  const renderAdminCards = () => {
    const isSuperUser = user.role === Role.SUPERUSER;
    const isAdminResource = user.role === Role.ADMIN_RESOURCE;
    const isAdminReservation = user.role === Role.ADMIN_RESERVATION;

    return (
      <Row className="mb-4 admin-card-row">
        {isSuperUser && (
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
        )}
        {(isSuperUser || isAdminResource) && (
          <>
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
          </>
        )}
        {(isSuperUser || isAdminResource || isAdminReservation) && (
          <>
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
                  <Image src={cardImages.calendars} alt="Calendarios" fill style={{ objectFit: 'contain' }} />
                </div>
                <Card.Body className="d-flex flex-column text-center">
                  <Card.Title>Calendarios</Card.Title>
                  <Card.Text className="flex-grow-1">Gestionar reservas de espacios y equipos.</Card.Text>
                  <Link href="/admin/calendars" className="btn btn-primary mt-auto" style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>
                    Ir a Calendarios
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </>
        )}
        {isSuperUser && (
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
        )}
        {(isSuperUser || isAdminResource) && ( // NEW: Reports card
          <Col>
            <Card className="h-100">
              <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: 'white' }}>
                <Image src={cardImages.reports} alt="Reportes" fill style={{ objectFit: 'contain' }} />
              </div>
              <Card.Body className="d-flex flex-column text-center">
                <Card.Title>Reportes</Card.Title>
                <Card.Text className="flex-grow-1">Gestionar reportes de usuarios.</Card.Text>
                <Link href="/admin/reports" className="btn btn-primary mt-auto" style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>
                  Ir a Reportes
                </Link>
              </Card.Body>
            </Card>
          </Col>
        )}

      </Row>
    );
  };

  const renderReservations = () => (
    <Col>
        <h3>Reservaciones</h3>
        {/* Mobile Layout */}
        <div className="d-block d-md-none mb-3">
          <Row className="mb-3">
            <Col>
              <Form.Control
                type="text"
                placeholder="Buscar en reservaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>
          </Row>
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
                variant={filter === 'approved' ? 'primary' : 'outline-primary'}
                onClick={() => setFilter('approved')}
                className="w-100"
              >
                Aprobadas
              </Button>
            </Col>
            <Col xs={4}>
              <Button
                variant={filter === 'rejected' ? 'primary' : 'outline-primary'}
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
                variant={filter === 'partially_approved' ? 'primary' : 'outline-primary'}
                onClick={() => setFilter('partially_approved')}
                className="w-100"
              >
                Parciales
              </Button>
            </Col>
            <Col xs={4}>
              <Button
                variant={filter === 'all' ? 'primary' : 'outline-primary'}
                onClick={() => setFilter('all')}
                className="w-100"
              >
                Todas
              </Button>
            </Col>
            <Col xs={4}>
              <Button variant="primary" onClick={() => fetchReservations(filter, currentPage, searchTerm)} className="w-100">
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
            variant={filter === 'approved' ? 'primary' : 'outline-primary'}
            onClick={() => setFilter('approved')}
          >
            Aprobadas
          </Button>
          <Button
            variant={filter === 'rejected' ? 'primary' : 'outline-primary'}
            onClick={() => setFilter('rejected')}
          >
            Rechazadas
          </Button>
          <Button
            variant={filter === 'partially_approved' ? 'primary' : 'outline-primary'}
            onClick={() => setFilter('partially_approved')}
          >
            Parciales
          </Button>
          <Button
            variant={filter === 'all' ? 'primary' : 'outline-primary'}
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
          <Button variant="primary" onClick={() => fetchReservations(filter, currentPage, searchTerm)}>
            Refrescar
          </Button>
          <div className="ms-auto">
            <Form.Control
              type="text"
              placeholder="Buscar en reservaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '250px' }}
            />
          </div>
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
        {/* Pagination Controls */}
        {!loadingReservations && !error && totalPages > 1 && (
          <Row className="mt-3">
            <Col className="d-flex justify-content-center">
              <ButtonGroup>
                <Button
                  variant="outline-primary"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                {[...Array(totalPages)].map((_, index) => (
                  <Button
                    key={index + 1}
                    variant={currentPage === index + 1 ? 'primary' : 'outline-primary'}
                    onClick={() => setCurrentPage(index + 1)}
                  >
                    {index + 1}
                  </Button>
                ))}
                <Button
                  variant="outline-primary"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </ButtonGroup>
            </Col>
          </Row>
        )}
      </Col>
  );

  const isAdminReservation = user.role === Role.ADMIN_RESERVATION;

  return (
    <Container fluid style={{ paddingTop: '100px' }}>
      <Row className="mb-4">
        <Col>
          <p className="mb-4">Bienvenido, {user.email}. Aquí puedes gestionar la plataforma.</p>
        </Col>
      </Row>

      {isAdminReservation ? (
        <Row>
          <Col md={3}>
            {renderAdminCards()}
          </Col>
          <Col md={9}>
            <Row className="mb-4">
              {renderReservations()}
            </Row>
          </Col>
        </Row>
      ) : (
        <>
          {renderAdminCards()}
          <Row className="mb-4">
            {renderReservations()}
          </Row>
        </>
      )}
    </Container>
  );
}