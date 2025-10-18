'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Container, Row, Col, Spinner, Alert, Carousel, Button } from 'react-bootstrap';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

interface Image {
  id: string;
  url: string;
}

interface ResourceDetail {
  id: string;
  name: string;
  description: string | null;
  images: Image[]; // Cambiado a array de Image
  type: 'space' | 'equipment' | 'workshop';
  serialNumber?: string | null; // For equipment
  fixedAssetId?: string | null; // For equipment
  responsibleUser?: { firstName: string | null; lastName: string | null; email: string } | null;
  teacher?: string | null; // For workshop
  startDate?: string | null; // For workshop
  endDate?: string | null; // For workshop
  sessions?: WorkshopSession[]; // For workshop
  inscriptionsOpen?: boolean; // For workshop
  inscriptionsStartDate?: string | null; // For workshop
  capacity?: number; // For workshop
  _count?: { inscriptions: number }; // For workshop capacity
}

interface WorkshopSession {
  id: string;
  dayOfWeek: number;
  timeStart: string;
  timeEnd: string;
  room?: string | null;
}

export default function ResourceDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();

  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const type = searchParams.get('type');

  console.log('Resource Object:', JSON.stringify(resource, null, 2)); // Added for debugging endDate

  useEffect(() => {
    if (!id || !type) {
      setError('ID de recurso o tipo no especificado.');
      setLoading(false);
      return;
    }

    const fetchResource = async () => {
      setLoading(true);
      setError(null);
      try {
        let apiUrl = '';
        switch (type) {
          case 'space':
            apiUrl = `/api/spaces/${id}`;
            break;
          case 'equipment':
            apiUrl = `/api/equipment/${id}`;
            break;
          case 'workshop':
            apiUrl = `/api/workshops/${id}`;
            break;
          default:
            throw new Error('Tipo de recurso inválido.');
        }

        const res = await fetch(apiUrl);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Error al cargar ${type} detalles`);
        }

        const data: ResourceDetail = await res.json();
        setResource({ ...data, type: type as 'space' | 'equipment' | 'workshop' });
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        }
        else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [id, type]);

  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleInscribe = async () => {
    setIsSubscribing(true);
    try {
      const res = await fetch(`/api/workshops/${resource?.id}/inscribe`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        alert('¡Inscripción exitosa!');
        // TODO: Idealmente, se debería refrescar el estado para actualizar el contador de inscritos.
      } else {
        throw new Error(data.error || 'No se pudo realizar la inscripción.');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`Error: ${error.message}`);
      } else {
        alert('An unknown error occurred');
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const isFull = resource?.type === 'workshop' && resource?.capacity && resource?.capacity > 0 && resource?._count?.inscriptions && resource._count.inscriptions >= resource.capacity;
  const areInscriptionsOpen = resource?.type === 'workshop' && (resource?.inscriptionsOpen ?? true);
  const inscriptionsNotStarted = resource?.type === 'workshop' && resource?.inscriptionsStartDate && new Date() < new Date(resource.inscriptionsStartDate);

  if (loading) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando detalles del recurso...</p></Container>;
  }

  if (loading) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando detalles del recurso...</p></Container>;
  }

  if (error) {
    return <Container className="mt-5"><Alert variant="danger">Error: {error}</Alert></Container>;
  }

  if (!resource) {
    return <Container className="mt-5"><Alert variant="warning">Recurso no encontrado.</Alert></Container>;
  }

  return (
    <Container style={{ paddingTop: '100px' }}>
            {resource.images && resource.images.length > 0 ? (
        <Carousel interval={null} indicators={false} className="mb-4">
          {resource.images.map((img, idx) => (
            <Carousel.Item key={img.id || idx}>
              <div style={{ position: 'relative', width: '100%', height: '500px' }}>
                <Image
                  src={img.url}
                  alt={`Imagen de ${resource.name} ${idx + 1}`}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
            </Carousel.Item>
          ))}
        </Carousel>
      ) : (
        <div style={{ position: 'relative', width: '100%', height: '500px' }} className="mb-4">
          <Image
            src="/placeholder.svg"
            alt="No Image"
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}

      <h2>{resource.name}</h2>
      <p><strong>Descripción:</strong> {resource.description || 'Sin descripción.'}</p>
      {(resource.type === 'space' || resource.type === 'equipment') && resource.responsibleUser && (
        <p>
          <strong>Responsable:</strong>{' '}
          {`${resource.responsibleUser.firstName || ''} ${resource.responsibleUser.lastName || ''}`.trim() || 'N/A'}{' '}
          ({resource.responsibleUser.email})
        </p>
      )}
      {resource.type === 'equipment' && resource.serialNumber && <p className="card-text"><strong>Número de Serie:</strong> {resource.serialNumber}</p>}
      {resource.type === 'equipment' && resource.fixedAssetId && <p className="card-text"><strong>ID de Activo Fijo:</strong> {resource.fixedAssetId}</p>}
      {resource.type === 'workshop' && resource.teacher && (
        <p className="card-text"><strong>Maestro:</strong> {resource.teacher}</p>
      )}
      {resource.type === 'workshop' && resource.startDate && (
        <p className="card-text"><strong>Fecha de Inicio:</strong> {new Date(resource.startDate).toLocaleDateString()}</p>
      )}
      {resource.type === 'workshop' && resource.endDate && (
        <p className="card-text"><strong>Fecha de Fin:</strong> {new Date(resource.endDate).toLocaleDateString()}</p>
      )}
      {resource.type === 'workshop' && resource.inscriptionsStartDate && (
        <p className="card-text"><strong>Apertura de Inscripciones:</strong> {new Date(resource.inscriptionsStartDate).toLocaleDateString()}</p>
      )}
      {resource.type === 'workshop' && resource.capacity && resource.capacity > 0 && (
        <p className="card-text"><strong>Capacidad:</strong> {resource.capacity} {resource._count?.inscriptions ? `(${resource._count.inscriptions} inscritos)` : ''}</p>
      )}

      {resource.type === 'workshop' && resource.sessions && resource.sessions.length > 0 && (
        <div className="mb-3">
          <p><strong>Sesiones:</strong></p>
          <ul>
            {Object.values(
              resource.sessions.reduce((acc, session) => {
                const key = `${session.timeStart}-${session.timeEnd}-${session.room || 'N/A'}`;
                if (!acc[key]) {
                  acc[key] = {
                    days: [],
                    timeStart: session.timeStart,
                    timeEnd: session.timeEnd,
                    room: session.room,
                  };
                }
                acc[key].days.push(session.dayOfWeek);
                return acc;
              }, {} as Record<string, { days: number[]; timeStart: string; timeEnd: string; room?: string | null }>)
            ).map((group, idx) => {
              const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
              const sortedDays = group.days.sort((a, b) => a - b);
              const dayStr = new Intl.ListFormat('es-MX', { style: 'long', type: 'conjunction' }).format(
                sortedDays.map(d => dayNames[d])
              );
              const timeStr = `de ${group.timeStart} a ${group.timeEnd}`;
              const roomStr = group.room ? `en el aula ${group.room}` : '';

              return (
                <li key={idx}>
                  {`${dayStr.charAt(0).toUpperCase() + dayStr.slice(1)} ${timeStr} ${roomStr}`}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="d-flex justify-content-end mt-3">
        {resource.type === 'workshop' ? (
          <Button
            variant="primary"
            onClick={handleInscribe}
            className="me-2"
            disabled={isSubscribing || isFull || !areInscriptionsOpen || inscriptionsNotStarted}
            style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}
            title={
              isFull ? 'Taller lleno'
              : !areInscriptionsOpen ? 'Inscripciones cerradas'
              : inscriptionsNotStarted ? `Inscripciones abren el ${resource.inscriptionsStartDate ? new Date(resource.inscriptionsStartDate).toLocaleDateString() : ''}`
              : 'Inscribirme al taller'
            }
          >
            {isSubscribing ? 'Inscribiendo...' : isFull ? 'Taller Lleno' : !areInscriptionsOpen ? 'Cerrado' : inscriptionsNotStarted ? 'Próximamente' : 'Inscribirme'}
          </Button>
        ) : (
          (resource.type === 'space' || resource.type === 'equipment') ? (
            <Button variant="primary" onClick={() => addToCart({ id: resource.id, name: resource.name, type: resource.type as 'space' | 'equipment', images: resource.images })} className="me-2">
              Añadir al Carrito
            </Button>
          ) : null
        )}

      </div>
    </Container>
  );
}