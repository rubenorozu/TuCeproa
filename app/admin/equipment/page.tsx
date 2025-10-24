'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Spinner, Alert, Container, Row, Col, Modal, Form } from 'react-bootstrap';
// import Image from 'next/image'; // Reemplazado por <img>
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Image {
  id: string;
  url: string;
}

interface Equipment {
  id: string;
  displayId: string | null;
  name: string;
  description: string | null;
  serialNumber: string | null;
  fixedAssetId: string | null;
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

export default function AdminEquipmentPage() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // Nuevo estado para el término de búsqueda
  const [success, setSuccess] = useState<string | null>(null); // Añadir estado de éxito
  const [showModal, setShowModal] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState<Equipment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Nuevo estado para controlar el envío
  const [form, setForm] = useState({
    name: '',
    description: '',
    serialNumber: '',
    fixedAssetId: '',
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

  async function fetchEquipment(searchQuery: string = '', responsibleUserId: string | null = null) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/equipment?search=${searchQuery}${responsibleUserId ? `&responsibleUserId=${responsibleUserId}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar los equipos.');
      }
      const data: Equipment[] = await response.json();
      setEquipment(data);
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
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/responsible-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
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
          fetchEquipment(searchTerm, user.id);
        } else {
          fetchEquipment(searchTerm);
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

  const handleShowModal = (item?: Equipment) => {
    setCurrentEquipment(item || null);
    setForm({
      name: item?.name || '',
      description: item?.description || '',
      serialNumber: item?.serialNumber || '',
      fixedAssetId: item?.fixedAssetId || '',
      responsibleUserId: (user.role === 'ADMIN_RESOURCE' && !item) ? user.id : item?.responsibleUserId || '',
    });
    setExistingImages(item?.images || []);
    setSelectedFiles(null);
    setError(null);   // Resetear errores
    setSuccess(null); // Resetear mensajes de éxito
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentEquipment(null);
    setForm({
      name: '',
      description: '',
      serialNumber: '',
      fixedAssetId: '',
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

    const method = currentEquipment ? 'PUT' : 'POST';
    const url = currentEquipment ? `/api/admin/equipment/${currentEquipment.id}` : '/api/admin/equipment';

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
        throw new Error(errorData.error || `Error al ${currentEquipment ? 'actualizar' : 'crear'} el equipo.`);
      }

      setSuccess(`Equipo ${currentEquipment ? 'actualizado' : 'creado'} correctamente.`);
      handleCloseModal(); // Cerrar modal al éxito
      fetchEquipment(); // Recargar la lista de equipos
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

  const handleDelete = async (equipmentId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este equipo? Esta acción es irreversible.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/equipment/${equipmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo eliminar el equipo.');
      }

      alert('Equipo eliminado correctamente.');
      fetchEquipment(); // Recargar la lista de equipos
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

  if (user.role !== 'SUPERUSER' && user.role !== 'ADMIN_RESOURCE') {
    return <Alert variant="danger" className="mt-5">Acceso denegado. No tienes permisos de Superusuario o Administrador de Recursos.</Alert>;
  }

  return (
    <Container fluid style={{ paddingTop: '100px' }}>
      {/* Mobile Layout */}
      <div className="d-block d-md-none">
        <Row className="mb-3">
          <Col xs={12} className="text-center">
            <h2>Gestión de Equipos</h2>
          </Col>
          <Col xs={12} className="text-center mt-3">
          <Row className="g-0 mb-2">
            <Col xs={6} className="px-1">
              <Button variant="primary" onClick={() => handleShowModal()} className="w-100 text-nowrap overflow-hidden text-truncate" style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>Añadir Nuevo Equipo</Button>
            </Col>
            <Col xs={6} className="px-1">
              <Button variant="secondary" onClick={() => window.location.href = '/api/admin/equipment'} className="w-100 text-nowrap overflow-hidden text-truncate">
                Descargar CSV
              </Button>
            </Col>
          </Row>            <div className="d-flex justify-content-end">
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
              placeholder="Buscar equipos por nombre, descripción, número de serie o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
        </Row>
      </div>

      {/* Desktop Layout */}
      <Row className="d-none d-md-flex align-items-center mb-3">
        <Col md={3} className="text-start">
          <h2>Gestión de Equipos</h2>
        </Col>
        <Col md={9} className="text-end">
          <div className="d-flex justify-content-end gap-2">
            <Form.Control
              type="text"
              placeholder="Buscar equipos por nombre, descripción, número de serie o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 'auto' }} // Allow natural width
              className="me-2" // Add margin to the right of the search field
            />
            <Button variant="primary" onClick={() => handleShowModal()} style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>Añadir Nuevo Equipo</Button>
            <Button variant="secondary" onClick={() => window.location.href = '/api/admin/equipment'}>
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
              <th>ID</th><th>Nombre</th><th>Imágenes</th><th>Responsable</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map(item => (
              <tr key={item.id}>
                <td>{item.displayId || item.id}</td>
                <td>{item.name}</td>
                <td>
                  {item.images && item.images.length > 0 ? (
                    <div className="d-flex flex-wrap">
                      {item.images.map(img => (
                        <img key={img.id} src={img.url} alt="Equipment Image" width={50} height={50} style={{ objectFit: 'cover', margin: '2px' }} className="img-thumbnail" />
                      ))}
                    </div>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td>
                  {item.responsibleUser
                    ? `${item.responsibleUser.firstName} ${item.responsibleUser.lastName}`
                    : 'N/A'}
                </td>
                <td>
                  <Button variant="warning" size="sm" className="me-2" onClick={() => handleShowModal(item)}>
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
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
          <Modal.Title>{currentEquipment ? 'Editar Equipo' : 'Añadir Nuevo Equipo'}</Modal.Title>
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
              <Form.Label>Número de Serie</Form.Label>
              <Form.Control
                type="text"
                name="serialNumber"
                value={form.serialNumber}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>ID de Activo Fijo</Form.Label>
              <Form.Control
                type="text"
                name="fixedAssetId"
                value={form.fixedAssetId}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Imágenes</Form.Label>
              {existingImages.length > 0 && (
                <div className="mb-2 d-flex flex-wrap">
                  {existingImages.map(img => (
                    <div key={img.id} className="position-relative me-2 mb-2">
                      <img src={img.url} alt="Existing Image" width={50} height={50} style={{ objectFit: 'cover', margin: '2px' }} className="img-thumbnail" />
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
                Selecciona una o varias imágenes. Las imágenes existentes se mantendrán a menos que las elimines manualmente de la base de datos.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>ID de Usuario Responsable</Form.Label>
              {user?.role === 'ADMIN_RESOURCE' ? (
                <Form.Control
                  type="text"
                  value={currentEquipment ? `${currentEquipment.responsibleUser?.firstName || ''} ${currentEquipment.responsibleUser?.lastName || ''}`.trim() : (`${user.firstName || ''} ${user.lastName || ''}`).trim()}
                  readOnly
                  disabled
                />
              ) : (
                <>
                  {responsibleUsersLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : responsibleUsersError ? (
                    <Alert variant="danger">Error al cargar responsables</Alert>
                  ) : (
                    <Form.Select
                      name="responsibleUserId"
                      value={form.responsibleUserId || ''}
                      onChange={handleChange}
                    >
                      <option value="">-- Ninguno --</option>
                      {responsibleUsers.map(rUser => (
                        <option key={rUser.id} value={rUser.id}>
                          {rUser.firstName} {rUser.lastName} ({rUser.email})
                        </option>
                      ))}
                    </Form.Select>
                  )}
                </>
              )}
            </Form.Group>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>} {/* Mostrar mensaje de éxito */}
            <Button variant="primary" type="submit" className="w-100" disabled={isSubmitting}> {/* Deshabilitar botón */}
              {isSubmitting ? 'Guardando...' : (currentEquipment ? 'Guardar Cambios' : 'Crear Equipo')}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
