'use client';

import { useState, useEffect } from 'react';
import { Container, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';

export default function AdminSettingsPage() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [limit, setLimit] = useState('');
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
        body: JSON.stringify({ extraordinaryInscriptionLimit: limit }),
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
        {success && <Alert variant="success">{success}</Alert>}
        <Button variant="primary" type="submit">
          Guardar Cambios
        </Button>
      </Form>
    </Container>
  );
}
