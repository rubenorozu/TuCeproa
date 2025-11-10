'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Spinner, Alert, Container, Row, Col, Modal, Form, ButtonGroup } from 'react-bootstrap';
// import Image from 'next/image'; // Reemplazado por <img>
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
  status: string;
  requirements: { id: string; name: string }[];
  responsibleUserId: string | null;
  responsibleUser: {
    firstName: string;
    lastName: string;
  } | null;
  reservationLeadTime: number | null; // NEW: Add reservationLeadTime to Space interface
  requiresSpaceReservationWithEquipment: boolean; // NEW: Add this field
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
  const [searchTerm, setSearchTerm] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateWithEquipment, setDuplicateWithEquipment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    responsibleUserId: '',
    reservationLeadTime: '',
    requiresSpaceReservationWithEquipment: false, // NEW: Initialize this field
  });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [existingImages, setExistingImages] = useState<Image[]>([]);
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);

  const [responsibleUsers, setResponsibleUsers] = useState<ResponsibleUser[]>([]);
  const [responsibleUsersLoading, setResponsibleUsersLoading] = useState(true);
  const [responsibleUsersError, setResponsibleUsersError] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const response = await fetch('/api/admin/requirements');
        if (response.ok) {
          const data = await response.json();
          setRequirements(data);
        }
      } catch (error) {
        console.error('Error al cargar los requisitos:', error);
      }
    };

    fetchRequirements();
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10; // Define page size
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);

  useEffect(() => {
    if (!sessionLoading && (!user || (user.role !== 'SUPERUSER' && user.role !== 'ADMIN_RESOURCE'))) {
      router.push('/'); // Redirigir si no es superusuario ni ADMIN_RESOURCE
    }
  }, [user, sessionLoading, router]);

  async function fetchSpaces(searchQuery: string = '', responsibleUserId: string | null = null, page: number = 1) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/spaces?search=${searchQuery}${responsibleUserId ? `&responsibleUserId=${responsibleUserId}` : ''}&page=${page}&pageSize=${pageSize}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar los espacios.');
      }
      const result = await response.json();
      console.log('DEBUG: API /api/admin/spaces response result:', result);
      setSpaces(result.spaces);
      setTotalPages(Math.ceil(result.totalSpaces / pageSize));
      setSelectedSpaceIds([]); // Clear selection on new fetch
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
          fetchSpaces(searchTerm, user.id, currentPage);
        } else {
          fetchSpaces(searchTerm, null, currentPage);
        }
      }, 500); // Debounce por 500ms

      return () => {
        clearTimeout(handler);
      };
    }
  }, [sessionLoading, user, searchTerm, currentPage]);

  useEffect(() => {
    if (!sessionLoading && user && user.role === 'SUPERUSER') {
      fetchResponsibleUsers();
    }
  }, [sessionLoading, user]);

  const handleShowModal = (space?: Space) => {
    setCurrentSpace(space || null);
    setIsDuplicating(false);
    setForm({
      name: space?.name || '',
      description: space?.description || '',
      responsibleUserId: (user && user.role === 'ADMIN_RESOURCE' && !space) ? user.id : space?.responsibleUserId || '',
      reservationLeadTime: space?.reservationLeadTime?.toString() || '',
      requiresSpaceReservationWithEquipment: space?.requiresSpaceReservationWithEquipment || false, // NEW: Initialize this field
    });
    setSelectedRequirements(space?.requirements.map(req => req.id) || []);
    setExistingImages(space?.images || []);
    setSelectedFiles(null);
    setError(null);   // Resetear errores
    setSuccess(null); // Resetear mensajes de éxito
    setShowModal(true);
  };

  const handleDuplicate = (space: Space) => {
    setCurrentSpace(null); // Ensure it's treated as a new creation
    setIsDuplicating(true);
    setDuplicateWithEquipment(false);
    setForm({
      name: `${space.name} (Copia)`,
      description: space.description || '',
      responsibleUserId: space.responsibleUserId || '',
      reservationLeadTime: space.reservationLeadTime?.toString() || '',
      requiresSpaceReservationWithEquipment: space.requiresSpaceReservationWithEquipment || false,
    });
    setSelectedRequirements(space.requirements.map(req => req.id) || []);
    setExistingImages(space.images || []);
    setSelectedFiles(null);
    setError(null);
    setSuccess(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentSpace(null);
    setIsDuplicating(false);
    setForm({
      name: '',
      description: '',
      responsibleUserId: '',
      reservationLeadTime: '',
      requiresSpaceReservationWithEquipment: false, // NEW: Reset this field
    });
    setExistingImages([]);
    setSelectedFiles(null);
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement; // Cast to HTMLInputElement to access 'checked'
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'reservationLeadTime' ? (value === '' ? null : parseInt(value, 10)) : (value === '' ? null : value))
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleRemoveExistingImage = (imageId: string) => {
    setExistingImages(prevImages => prevImages.filter(img => img.id !== imageId));
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedSpaceIds(spaces.map(item => item.id));
    } else {
      setSelectedSpaceIds([]);
    }
  };

  const handleSelectSpace = (spaceId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedSpaceIds(prev => [...prev, spaceId]);
    } else {
      setSelectedSpaceIds(prev => prev.filter(id => id !== spaceId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSpaceIds.length === 0) return;

    if (!window.confirm(`¿Estás seguro de que quieres eliminar ${selectedSpaceIds.length} espacio(s) seleccionado(s)? Esta acción es irreversible.`)) {
      return;
    }

    setError(null);

    try {
      const response = await fetch('/api/admin/spaces/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedSpaceIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar los espacios seleccionados.');
      }

      alert('Espacio(s) eliminado(s) correctamente.');
      setSelectedSpaceIds([]); // Clear selection after successful deletion
      fetchSpaces(); // Refresh the list of spaces
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      alert(`Error al eliminar: ${err instanceof Error ? err.message : 'An unknown error occurred'}`);
    }
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
          requirementIds: selectedRequirements,
          reservationLeadTime: form.reservationLeadTime ? parseInt(form.reservationLeadTime, 10) : null, // Enviar el tiempo de antelación
          requiresSpaceReservationWithEquipment: form.requiresSpaceReservationWithEquipment, // NEW: Send this field
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

  const handleToggleStatus = async (spaceId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'AVAILABLE' ? 'IN_MAINTENANCE' : 'AVAILABLE';
    if (!window.confirm(`¿Estás seguro de que quieres cambiar el estado a ${newStatus === 'AVAILABLE' ? 'Disponible' : 'En Mantenimiento'}?`)) return;

    try {
      const response = await fetch(`/api/admin/spaces/${spaceId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo actualizar el estado del espacio.');
      }

      alert('Estado actualizado correctamente.');
      fetchSpaces();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        alert(`Error al actualizar el estado: ${err.message}`);
      } else {
        setError('An unknown error occurred');
        alert('An unknown error occurred');
      }
    }
  };

  if (sessionLoading || !user) {
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
            <h2>Gestión de Espacios</h2>
          </Col>
          <Col xs={12} className="text-center mt-3">
          <Row className="g-0 mb-2">
            <Col xs={6} className="px-1">
              <Button variant="primary" onClick={() => handleShowModal()} className="w-100 text-nowrap overflow-hidden text-truncate" style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>Añadir Nuevo Espacio</Button>
            </Col>
            <Col xs={6} className="px-1">
              <Button
                variant="danger"
                onClick={handleBulkDelete}
                className="w-100 text-nowrap overflow-hidden text-truncate"
                disabled={selectedSpaceIds.length === 0}
              >
                Eliminar Seleccionados ({selectedSpaceIds.length})
              </Button>
            </Col>
            <Col xs={6} className="px-1">
              <Button variant="secondary" onClick={() => {
                const link = document.createElement('a');
                link.href = '/api/admin/export?model=spaces';
                link.setAttribute('download', 'Espacios_TuCeproa.csv'); // Suggest a filename
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }} className="w-100 text-nowrap overflow-hidden text-truncate btn-hover-white-text">
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
              placeholder="Buscar espacios por nombre, descripción o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
        </Row>
      </div>

      {/* Desktop Layout */}
      <Row className="d-none d-md-flex align-items-center mb-3">
        <Col md={3} className="text-start">
          <h2>Gestión de Espacios</h2>
        </Col>
        <Col md={9} className="text-end">
          <div className="d-flex justify-content-end gap-2">
            <Form.Control
              type="text"
              placeholder="Buscar espacios por nombre, descripción o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 'auto' }} // Allow natural width
              className="me-2" // Add margin to the right of the search field
            />
            <Button variant="primary" onClick={() => handleShowModal()} style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>Añadir Nuevo Espacio</Button>
            <Button
              variant="danger"
              onClick={handleBulkDelete}
              disabled={selectedSpaceIds.length === 0}
            >
              Eliminar Seleccionados ({selectedSpaceIds.length})
            </Button>
            <Button variant="secondary" onClick={() => {
              const link = document.createElement('a');
              link.href = '/api/admin/export?model=spaces';
              link.setAttribute('download', 'Espacios_TuCeproa.csv'); // Suggest a filename
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }} className="btn-hover-white-text">
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
              <>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>
                        <Form.Check
                          type="checkbox"
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          checked={selectedSpaceIds.length === spaces.length && spaces.length > 0}
                          disabled={spaces.length === 0}
                        />
                      </th>
                      <th>ID</th><th>Nombre</th><th>Imágenes</th><th>Responsable</th><th>Estado</th><th>Requisitos</th>                      <th>Tiempo Antelación Reserva</th><th>Reserva con Equipo</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spaces.map(space => (
                      console.log('DEBUG: Rendering space in table:', space),
                      <tr key={space.id}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={selectedSpaceIds.includes(space.id)}
                            onChange={(e) => handleSelectSpace(space.id, e.target.checked)}
                          />
                        </td>
                        <td>{space.displayId || space.id}</td>
                        <td>{space.name}</td>
                        <td>
                          {space.images && space.images.length > 0 ? (
                            <div className="d-flex flex-wrap">
                              {space.images.map(img => (
                                <img key={img.id} src={img.url} alt="Space Image" width={50} height={50} style={{ objectFit: 'cover', margin: '2px' }} className="img-thumbnail" />
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
                          <Button
                            variant={space.status === 'AVAILABLE' ? 'success' : 'danger'}
                            size="sm"
                            onClick={() => handleToggleStatus(space.id, space.status)}
                          >
                            {space.status === 'AVAILABLE' ? 'Disponible' : 'En Mantenimiento'}
                          </Button>
                        </td>
                        <td>{space.requirements.map(req => req.name).join(', ')}</td>
                        <td>{space.reservationLeadTime !== null ? `${space.reservationLeadTime} horas` : 'Global'}</td>
                        <td>{space.requiresSpaceReservationWithEquipment ? 'Sí' : 'No'}</td>
                        <td>
                          <Button variant="warning" size="sm" className="me-2" onClick={() => handleShowModal(space)}>
                            Editar
                          </Button>
                          <Button variant="danger" size="sm" className="me-2" onClick={() => handleDelete(space.id)}>
                            Eliminar
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleDuplicate(space)}>Duplicar</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
          <div className="d-flex justify-content-center mt-3">
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
                  onClick={() => setCurrentPage(index + 1)}
                  variant={currentPage === index + 1 ? 'primary' : 'outline-primary'}
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
          </div>              </>
            )}
      
            <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{isDuplicating ? 'Duplicar Espacio' : (currentSpace ? 'Editar Espacio' : 'Añadir Nuevo Espacio')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            {isDuplicating && (
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Duplicar también los equipos asociados"
                  checked={duplicateWithEquipment}
                  onChange={(e) => setDuplicateWithEquipment(e.target.checked)}
                />
              </Form.Group>
            )}
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
                      <img src={img.url} alt="Existing Image" width={50} height={50} style={{ objectFit: 'cover' }} className="img-thumbnail" />
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
              <Form.Label>Requisitos</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {requirements.map(requirement => (
                  <Button
                    key={requirement.id}
                    variant={selectedRequirements.includes(requirement.id) ? 'primary' : 'outline-secondary'}
                    onClick={() => {
                      setSelectedRequirements(prev =>
                        prev.includes(requirement.id)
                          ? prev.filter(id => id !== requirement.id)
                          : [...prev, requirement.id]
                      );
                    }}
                    size="sm"
                  >
                    {requirement.name}
                  </Button>
                ))}
              </div>
              <Form.Text className="text-muted">
                Selecciona los requisitos que aplican a este espacio.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>ID de Usuario Responsable</Form.Label>
              {user?.role === 'ADMIN_RESOURCE' ? (
                <Form.Control
                  type="text"
                  value={currentSpace ? `${currentSpace.responsibleUser?.firstName || ''} ${currentSpace.responsibleUser?.lastName || ''}`.trim() : (`${user.firstName || ''} ${user.lastName || ''}`).trim()}
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
            <Form.Group className="mb-3">
              <Form.Label>Tiempo de Antelación de Reserva (horas)</Form.Label>
              <Form.Control
                type="number"
                name="reservationLeadTime"
                value={form.reservationLeadTime || ''}
                onChange={handleChange}
                min="0"
                placeholder="Ej: 24 (dejar vacío para usar el valor global)"
              />
              <Form.Text className="text-muted">
                Número de horas mínimo antes de la reserva. Si se deja vacío, se usará el valor global.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="requiresSpaceReservationWithEquipment"
                name="requiresSpaceReservationWithEquipment"
                label="Requiere reserva del espacio junto con el equipo"
                checked={form.requiresSpaceReservationWithEquipment}
                onChange={handleChange}
              />
              <Form.Text className="text-muted">
                Marcar si el espacio debe ser reservado automáticamente cuando se reserva cualquiera de sus equipos.
              </Form.Text>
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
