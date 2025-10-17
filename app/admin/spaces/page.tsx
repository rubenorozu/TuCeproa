'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Spinner, Alert, Container, Row, Col, Modal, Form } from 'react-bootstrap';
import Image from 'next/image';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Image {
  id: string;
  url: string;
}

interface Space {
  id: string;
  displayId: string | null;
  name: string;
  description: string | null;
  images: Image[];
  responsibleUserId: string | null;
  responsibleUser: {
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface ResponsibleUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function AdminSpacesPage() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // Nuevo estado para el término de búsqueda
  const [success, setSuccess] = useState<string | null>(null); // Añadir estado de éxito
  const [showModal, setShowModal] = useState(false);
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Nuevo estado para controlar el envío
  const [form, setForm] = useState({
    name: '',
    description: '',
    responsibleUserId: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [existingImages, setExistingImages] = useState<Image[]>([]);

  const [responsibleUsers, setResponsibleUsers] = useState<ResponsibleUser[]>([]);
  const [responsibleUsersLoading, setResponsibleUsersLoading] = useState(true);
  const [responsibleUsersError, setResponsibleUsersError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && (!user || (user.role !== 'SUPERUSER' && user.role !== 'ADMIN_RESOURCE'))) {
      router.push('/'); // Redirigir si no es superusuario ni ADMIN_RESOURCE
    }
  }, [user, sessionLoading, router]);

  async function fetchSpaces(searchQuery: string = '', responsibleUserId: string | null = null) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/spaces?search=${searchQuery}${responsibleUserId ? `&responsibleUserId=${responsibleUserId}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar los espacios.');
      }
      const data: Space[] = await response.json();
      setSpaces(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchResponsibleUsers() {
    setResponsibleUsersLoading(true);
    setResponsibleUsersError(null);
    try {
      const response = await fetch('/api/admin/responsible-users');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar usuarios responsables.');
      }
      const data: ResponsibleUser[] = await response.json();
      setResponsibleUsers(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setResponsibleUsersError(err.message);
      }
    } finally {
      setResponsibleUsersLoading(false);
    }
  }

  useEffect(() => {
    if (!sessionLoading && user && (user.role === 'SUPERUSER' || user.role === 'ADMIN_RESOURCE')) {
      const handler = setTimeout(() => {
        if (user.role === 'ADMIN_RESOURCE') {
          fetchSpaces(searchTerm, user.id);
        } else {
          fetchSpaces(searchTerm);
        }
      }, 500); // Debounce por 500ms

      return () => {
        clearTimeout(handler);
      };
    }
  }, [sessionLoading, user, searchTerm]);

  useEffect(() => {
    if (!sessionLoading && user && user.role === 'SUPERUSER') {
      fetchResponsibleUsers();
    }
  }, [sessionLoading, user]);

  const handleShowModal = (space?: Space) => {
    setCurrentSpace(space || null);
    setForm({
      name: space?.name || '',
      description: space?.description || '',
      responsibleUserId: (user.role === 'ADMIN_RESOURCE' && !space) ? user.id : space?.responsibleUserId || '',
    });
    setExistingImages(space?.images || []);
    setSelectedFiles(null);
    setError(null);   // Resetear errores
    setSuccess(null); // Resetear mensajes de éxito
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentSpace(null);
    setForm({
      name: '',
      description: '',
      responsibleUserId: '',
    });
    setExistingImages([]);
    setSelectedFiles(null);
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value === '' ? null : value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleRemoveExistingImage = (imageId: string) => {
    setExistingImages(prevImages => prevImages.filter(img => img.id !== imageId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null); // Resetear mensaje de éxito
    setIsSubmitting(true); // Deshabilitar botón al iniciar el envío

    let uploadedImageUrls: { url: string }[] = existingImages.map(img => ({ url: img.url })); // Asegurarse de que sea un array de objetos { url: string }

    if (selectedFiles && selectedFiles.length > 0) {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
      }

      try {
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Error al subir las imágenes.');
        }
        const uploadData = await uploadResponse.json();
        uploadedImageUrls = [...uploadedImageUrls, ...uploadData.urls.map((url: string) => ({ url }))]; // Asumiendo que la API de upload devuelve { urls: ['...'] }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
        setIsSubmitting(false); // Habilitar botón en caso de error de subida
        return; // Detener el proceso si la subida de imagen falla
      }
    }

    const method = currentSpace ? 'PUT' : 'POST';
    const url = currentSpace ? `/api/admin/spaces/${currentSpace.id}` : '/api/admin/spaces';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          images: uploadedImageUrls, // Enviar las URLs de las imágenes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al ${currentSpace ? 'actualizar' : 'crear'} el espacio.`);
      }

      setSuccess(`Espacio ${currentSpace ? 'actualizado' : 'creado'} correctamente.`);
      handleCloseModal(); // Cerrar modal al éxito
      fetchSpaces(); // Recargar la lista de espacios
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsSubmitting(false); // Habilitar botón al finalizar (éxito o error)
    }
  };

  const handleDelete = async (spaceId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este espacio? Esta acción es irreversible.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/spaces/${spaceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo eliminar el espacio.');
      }

      alert('Espacio eliminado correctamente.');
      fetchSpaces(); // Recargar la lista de espacios
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  if (sessionLoading || (!user && !sessionLoading)) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando sesión...</p></Container>;
  }

  if (user.role !== 'SUPERUSER' && user.role !== 'ADMIN_RESOURCE') {
    return <Alert variant="danger" className="mt-5">Acceso denegado. No tienes permisos de Superusuario o Administrador de Recursos.</Alert>;
  }

  return (
    <Container fluid style={{ paddingTop: '100px' }}>
      <Row className="mb-3 align-items-center">
        <Col>
          <h2>Gestión de Espacios</h2>
        </Col>
        <Col className="text-end">
          <Link href="/admin" passHref>
            <Button variant="outline-secondary" className="me-2">Regresar</Button>
          </Link>
          <Button variant="primary" onClick={() => handleShowModal()} className="me-2">Añadir Nuevo Espacio</Button>
          <Button variant="secondary" onClick={() => window.location.href = '/api/admin/export?model=spaces'}>
            Descargar CSV
          </Button>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col>
          <Form.Control
            type="text"
            placeholder="Buscar espacios por nombre, descripción o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
              <th>ID</th><th>Nombre</th><th>Imágenes</th><th>Responsable</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {spaces.map(space => (
              <tr key={space.id}>
                <td>{space.displayId || space.id}</td>
                <td>{space.name}</td>
                <td>
                  {space.images && space.images.length > 0 ? (
                    <div className="d-flex flex-wrap">
                      {space.images.map(img => (
                        <Image key={img.id} src={img.url} alt="Space Image" width={50} height={50} style={{ objectFit: 'cover', margin: '2px' }} className="img-thumbnail" />
                      ))}
                    </div>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td>
                  {space.responsibleUser
                    ? `${space.responsibleUser.firstName} ${space.responsibleUser.lastName}`
                    : 'N/A'}
                </td>
                <td>
                  <Button variant="warning" size="sm" className="me-2" onClick={() => handleShowModal(space)}>
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(space.id)}>
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{currentSpace ? 'Editar Espacio' : 'Añadir Nuevo Espacio'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={form.description}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Imágenes</Form.Label>
              {existingImages.length > 0 && (
                <div className="mb-2 d-flex flex-wrap">
                  {existingImages.map(img => (
                    <div key={img.id} className="position-relative me-2 mb-2">
                      <Image src={img.url} alt="Existing Image" width={50} height={50} style={{ objectFit: 'cover' }} className="img-thumbnail" />
                      <Button
                        variant="danger"
                        size="sm"
                        className="position-absolute top-0 start-100 translate-middle rounded-circle p-0"
                        style={{ width: '20px', height: '20px', fontSize: '0.7rem', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleRemoveExistingImage(img.id)}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Form.Control
                type="file"
                name="files"
                multiple
                onChange={handleFileChange}
              />
              <Form.Text className="text-muted">
                Selecciona una o varias imágenes. Las imágenes existentes se mantendrán.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>ID de Usuario Responsable</Form.Label>
              {user.role === 'ADMIN_RESOURCE' ? (
                <Form.Control
                  type="text"
                  value={currentSpace ? `${currentSpace.responsibleUser?.firstName || ''} ${currentSpace.responsibleUser?.lastName || ''}`.trim() : (`${user.firstName || ''} ${user.lastName || ''}`).trim()}
                  readOnly
                  disabled
                />
              ) : responsibleUsersLoading ? (
                <Spinner animation="border" size="sm" />
              ) : responsibleUsersError ? (
                <Alert variant="danger" size="sm">Error al cargar responsables</Alert>
              ) : (
                <Form.Select
                  name="responsibleUserId"
                  value={form.responsibleUserId || ''}
                  onChange={handleChange}
                  disabled={user.role === 'ADMIN_RESOURCE'} // Always disabled for ADMIN_RESOURCE
                >
                  <option value="">-- Ninguno --</option>
                  {responsibleUsers.map(rUser => (
                    <option key={rUser.id} value={rUser.id}>
                      {rUser.firstName} {rUser.lastName} ({rUser.email})
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>} {/* Mostrar mensaje de éxito */}
            <Button variant="primary" type="submit" className="w-100" disabled={isSubmitting}> {/* Deshabilitar botón */}
              {isSubmitting ? 'Guardando...' : (currentSpace ? 'Guardar Cambios' : 'Crear Espacio')}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
