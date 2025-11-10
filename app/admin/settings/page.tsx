'use client';

import { useState, useEffect } from 'react';
import { Container, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [limit, setLimit] = useState('');
  const [reservationLeadTime, setReservationLeadTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && (!user || user.role !== 'SUPERUSER')) {
      router.push('/admin');
    }
  }, [user, sessionLoading, router]);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) {
          throw new Error('Error al cargar la configuración.');
        }
        const data = await response.json();
        setLimit(data.extraordinaryInscriptionLimit || '');
        setReservationLeadTime(data.reservationLeadTime || '');
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

    if (user && user.role === 'SUPERUSER') {
      fetchSettings();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraordinaryInscriptionLimit: limit, reservationLeadTime: reservationLeadTime }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo actualizar la configuración.');
      }

      setSuccess('Configuración actualizada correctamente.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  if (sessionLoading || loading) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /></Container>;
  }

  if (error) {
    return <Container className="mt-5"><Alert variant="danger">{error}</Alert></Container>;
  }

  return (
    <Container style={{ paddingTop: '100px' }}>
      <h2>Configuración del Sistema</h2>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Límite de Solicitudes Extraordinarias</Form.Label>
          <Form.Control
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="Introduce el límite"
          />
          <Form.Text className="text-muted">
            El número máximo de solicitudes de inscripción extraordinarias que un usuario puede tener.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Tiempo de Antelación Global para Reservas (horas)</Form.Label>
          <Form.Control
            type="number"
            value={reservationLeadTime}
            onChange={(e) => setReservationLeadTime(e.target.value)}
            placeholder="Introduce el tiempo en horas"
          />
          <Form.Text className="text-muted">
            El tiempo mínimo de antelación con el que se puede solicitar una reserva. Este valor se usará de forma global a menos que se especifique uno diferente en un recurso o espacio.
          </Form.Text>
        </Form.Group>
        {success && <Alert variant="success">{success}</Alert>}
        <div className="d-flex gap-2">
          <Button variant="primary" type="submit">
            Guardar Cambios
          </Button>
          <Link href="/admin/requirements" passHref>
            <Button variant="info">Gestionar Requisitos</Button>
          </Link>
          <Link href="/admin" passHref>
            <Button variant="outline-primary">Regresar</Button>
          </Link>
        </div>
      </Form>
    </Container>
  );
}
