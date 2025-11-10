'use client';

import { useState, useEffect } from 'react';
import { Container, Button, Spinner, Alert, Table, Modal, Form, Row, Col } from 'react-bootstrap';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Requirement {
  id: string;
  name: string;
}

export default function AdminRequirementsPage() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentRequirement, setCurrentRequirement] = useState<Requirement | null>(null);
  const [form, setForm] = useState({ name: '' });

  useEffect(() => {
    if (!sessionLoading && (!user || user.role !== 'SUPERUSER')) {
      router.push('/admin');
    }
  }, [user, sessionLoading, router]);

  useEffect(() => {
    const fetchRequirements = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/requirements');
        if (!response.ok) {
          throw new Error('Error al cargar los requisitos.');
        }
        const data = await response.json();
        setRequirements(data);
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
      fetchRequirements();
    }
  }, [user]);

  const handleShowModal = (requirement?: Requirement) => {
    setCurrentRequirement(requirement || null);
    setForm({ name: requirement?.name || '' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentRequirement(null);
    setForm({ name: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = currentRequirement ? `/api/admin/requirements/${currentRequirement.id}` : '/api/admin/requirements';
    const method = currentRequirement ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo guardar el requisito.');
      }

      handleCloseModal();
      // Refetch requirements
      const fetchRequirements = async () => {
        const response = await fetch('/api/admin/requirements');
        const data = await response.json();
        setRequirements(data);
      };
      fetchRequirements();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  const handleDelete = async (requirementId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este requisito?')) return;

    try {
      const response = await fetch(`/api/admin/requirements/${requirementId}`, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo eliminar el requisito.');
      }

      // Refetch requirements
      const fetchRequirements = async () => {
        const response = await fetch('/api/admin/requirements');
        const data = await response.json();
        setRequirements(data);
      };
      fetchRequirements();
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
      <Row className="mb-3 align-items-center">
        <Col>
          <h2>Gestión de Requisitos</h2>
        </Col>
        <Col className="text-end">
          <Button onClick={() => handleShowModal()} className="me-2">Añadir Requisito</Button>
          <Link href="/admin/settings" passHref>
            <Button variant="outline-secondary">Regresar</Button>
          </Link>
        </Col>
      </Row>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map(requirement => (
            <tr key={requirement.id}>
              <td>{requirement.name}</td>
              <td>
                <Button variant="warning" size="sm" onClick={() => handleShowModal(requirement)} className="me-2">Editar</Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(requirement.id)}>Eliminar</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{currentRequirement ? 'Editar Requisito' : 'Añadir Requisito'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Form.Group>
            <Button variant="primary" type="submit">Guardar</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
