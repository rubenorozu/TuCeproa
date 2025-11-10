'use client';

import { useState, useEffect } from 'react';
import { Container, Button, Spinner, Alert, Table, Modal, Form } from 'react-bootstrap';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  description: string | null;
  owner: {
    firstName: string;
    lastName: string;
  };
}

export default function AdminProjectsPage() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!sessionLoading && (!user || user.role !== 'SUPERUSER')) {
      router.push('/admin');
    }
  }, [user, sessionLoading, router]);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/projects');
        if (!response.ok) {
          throw new Error('Error al cargar los proyectos.');
        }
        const data = await response.json();
        setProjects(data);
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
      fetchProjects();
    }
  }, [user]);

  const handleShowModal = (project?: Project) => {
    setCurrentProject(project || null);
    setForm({ name: project?.name || '', description: project?.description || '' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentProject(null);
    setForm({ name: '', description: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = currentProject ? `/api/admin/projects/${currentProject.id}` : '/api/admin/projects';
    const method = currentProject ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo guardar el proyecto.');
      }

      handleCloseModal();
      // Refetch projects
      const fetchProjects = async () => {
        const response = await fetch('/api/admin/projects');
        const data = await response.json();
        setProjects(data);
      };
      fetchProjects();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este proyecto?')) return;

    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo eliminar el proyecto.');
      }

      // Refetch projects
      const fetchProjects = async () => {
        const response = await fetch('/api/admin/projects');
        const data = await response.json();
        setProjects(data);
      };
      fetchProjects();
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
      <h2>Gestión de Proyectos</h2>
      <Button onClick={() => handleShowModal()} className="mb-3">Añadir Proyecto</Button>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Propietario</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <tr key={project.id}>
              <td>{project.name}</td>
              <td>{project.description}</td>
              <td>{`${project.owner.firstName} ${project.owner.lastName}`}</td>
              <td>
                <Button variant="warning" size="sm" onClick={() => handleShowModal(project)} className="me-2">Editar</Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(project.id)}>Eliminar</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{currentProject ? 'Editar Proyecto' : 'Añadir Proyecto'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Form.Group>
            <Button variant="primary" type="submit">Guardar</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
