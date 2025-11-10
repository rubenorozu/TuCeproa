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

interface WorkshopSession { // Nueva interfaz para las sesiones
  id?: string; // Make id optional as it might not exist for new sessions
  dayOfWeek: number;
  timeStart: string;
  timeEnd: string;
  room: string | null;
}

interface Workshop {
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
  capacity: number;
  availableFrom: string | null;
  inscriptionsOpen: boolean;
  inscriptionsStartDate: string | null;
  teacher: string | null;
  sessions: WorkshopSession[]; // NUEVO: Array de sesiones
  createdAt: string;
  updatedAt: string;
  endDate: string | null;
  startDate: string | null;
}

interface ResponsibleUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function AdminWorkshopsPage() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentWorkshop, setCurrentWorkshop] = useState<Workshop | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    responsibleUserId: '',
    capacity: 0,
    availableFrom: '',
    teacher: '',
    startDate: '',
    endDate: '',
    inscriptionsStartDate: '',
  });
  const [modalWorkshopSessions, setModalWorkshopSessions] = useState<WorkshopSession[]>([{ dayOfWeek: 1, timeStart: '09:00', timeEnd: '10:00', room: '' } as WorkshopSession]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [existingImages, setExistingImages] = useState<Image[]>([]);

  const [responsibleUsers, setResponsibleUsers] = useState<ResponsibleUser[]>([]);
  const [responsibleUsersLoading, setResponsibleUsersLoading] = useState(true);
  const [responsibleUsersError, setResponsibleUsersError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10; // Define page size
  const [selectedWorkshopIds, setSelectedWorkshopIds] = useState<string[]>([]);

  useEffect(() => {
    if (!sessionLoading && (!user || (user.role !== 'SUPERUSER' && user.role !== 'ADMIN_RESOURCE'))) {
      router.push('/'); // Redirigir si no es superusuario ni ADMIN_RESOURCE
    }
  }, [user, sessionLoading, router]);

  async function fetchWorkshops(searchQuery: string = '', responsibleUserId: string | null = null, page: number = 1) {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const url = `/api/admin/workshops?search=${searchQuery}${responsibleUserId ? `&responsibleUserId=${responsibleUserId}` : ''}&page=${page}&pageSize=${pageSize}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar los talleres.');
      }
      const result = await response.json();
      const updatedWorkshops = result.workshops.map((workshop: Workshop) => ({
        ...workshop,
        sessions: workshop.sessions || []
      }));
      setWorkshops(updatedWorkshops);
      setTotalPages(Math.ceil(result.totalWorkshops / pageSize));
      setSelectedWorkshopIds([]); // Clear selection on new fetch
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
          fetchWorkshops(searchTerm, user.id, currentPage);
        } else {
          fetchWorkshops(searchTerm, null, currentPage);
        }
      }, 500); // Debounce por 500ms

      return () => {
        clearTimeout(handler);
      };
    }
  }, [sessionLoading, user, searchTerm, currentPage]);

  useEffect(() => {
    if (!sessionLoading && user && user.role === 'SUPERUSER') {
      fetchResponsibleUsers(); // Fetch responsible users when component mounts
    }
  }, [sessionLoading, user]); // Depend on sessionLoading and user to ensure user role is checked

  const handleShowModal = (item?: Workshop) => {
    setCurrentWorkshop(item || null);
    setForm({
      name: item?.name || '',
      description: item?.description || '',
      responsibleUserId: (user && user.role === 'ADMIN_RESOURCE' && !item) ? user.id : item?.responsibleUserId || '',
      capacity: item?.capacity || 0,
      availableFrom: item?.availableFrom ? new Date(item.availableFrom).toISOString().slice(0, 16) : '',
      teacher: item?.teacher || '',
      startDate: item?.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '', // NUEVO: Inicializar startDate
      endDate: item?.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '', // NUEVO: Inicializar endDate
      inscriptionsStartDate: item?.inscriptionsStartDate ? new Date(item.inscriptionsStartDate).toISOString().slice(0, 16) : '', // NUEVO: Inicializar inscriptionsStartDate
    });
    setModalWorkshopSessions(item?.sessions && item.sessions.length > 0 ? item.sessions.map(s => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      timeStart: s.timeStart,
      timeEnd: s.timeEnd,
      room: s.room || '',
    })) : [{ id: '', dayOfWeek: 1, timeStart: '09:00', timeEnd: '10:00', room: '' }]); // NUEVO: Inicializar sesiones recurrentes
    setExistingImages(item?.images || []);
    setSelectedFiles(null);
    setShowModal(true);
  };

  const handleDuplicate = (item: Workshop) => {
    setCurrentWorkshop(null);
    setForm({
      name: `${item.name} (Copia)`,
      description: item.description || '',
      responsibleUserId: item.responsibleUserId || '',
      capacity: item.capacity || 0,
      availableFrom: item.availableFrom ? new Date(item.availableFrom).toISOString().slice(0, 16) : '',
      teacher: item.teacher || '',
      startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
      endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
      inscriptionsStartDate: item.inscriptionsStartDate ? new Date(item.inscriptionsStartDate).toISOString().slice(0, 16) : '',
    });
    setModalWorkshopSessions(item.sessions && item.sessions.length > 0 ? item.sessions.map(s => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      timeStart: s.timeStart,
      timeEnd: s.timeEnd,
      room: s.room || '',
    })) : [{ id: '', dayOfWeek: 1, timeStart: '09:00', timeEnd: '10:00', room: '' }]);
    setExistingImages(item.images || []);
    setSelectedFiles(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentWorkshop(null);
    setForm({
      name: '',
      description: '',
      responsibleUserId: '',
      capacity: 0,
      availableFrom: '',
      teacher: '',
      startDate: '', // NUEVO: Resetear startDate
      endDate: '', // NUEVO: Resetear endDate
      inscriptionsStartDate: '', // NUEVO: Resetear inscriptionsStartDate
    });
    setModalWorkshopSessions([{ dayOfWeek: 1, timeStart: '09:00', timeEnd: '10:00', room: '' }]); // Resetear sesiones recurrentes del modal
    setExistingImages([]);
    setSelectedFiles(null);
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleRemoveExistingImage = (imageId: string) => {
    setExistingImages(prevImages => prevImages.filter(img => img.id !== imageId));
  };

  const handleAddModalSession = () => {
    setModalWorkshopSessions([...modalWorkshopSessions, { dayOfWeek: 1, timeStart: '09:00', timeEnd: '10:00', room: '' }]);
  };

  const handleRemoveModalSession = (index: number) => {
    const newSessions = modalWorkshopSessions.filter((_, i) => i !== index);
    setModalWorkshopSessions(newSessions);
  };

  const handleModalSessionChange = (index: number, field: string, value: string | number) => {
    const newSessions = [...modalWorkshopSessions];
    newSessions[index] = { ...newSessions[index], [field]: value };
    setModalWorkshopSessions(newSessions);
  };



  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedWorkshopIds(workshops.map(item => item.id));
    } else {
      setSelectedWorkshopIds([]);
    }
  };

  const handleSelectWorkshop = (workshopId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedWorkshopIds(prev => [...prev, workshopId]);
    } else {
      setSelectedWorkshopIds(prev => prev.filter(id => id !== workshopId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedWorkshopIds.length === 0) return;

    if (!window.confirm(`¿Estás seguro de que quieres eliminar ${selectedWorkshopIds.length} taller(es) seleccionado(s)? Esta acción es irreversible.`)) {
      return;
    }

    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/workshops/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedWorkshopIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar los talleres seleccionados.');
      }

      alert('Taller(es) eliminado(s) correctamente.');
      setSelectedWorkshopIds([]); // Clear selection after successful deletion
      fetchWorkshops(); // Refresh the list of workshops
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      alert(`Error al eliminar: ${err instanceof Error ? err.message : 'An unknown error occurred'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let uploadedImageUrls: { url: string }[] = existingImages.map(img => ({ url: img.url }));

    if (selectedFiles && selectedFiles.length > 0) {
      const imageFormData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        imageFormData.append('files', selectedFiles[i]);
      }

      try {
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Error al subir las imágenes.');
        }
        const uploadData = await uploadResponse.json();
        uploadedImageUrls = [...uploadedImageUrls, ...uploadData.urls.map((url: string) => ({ url }))];
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred during upload');
        return;
      }
    }

    const method = currentWorkshop ? 'PUT' : 'POST';
    const url = currentWorkshop ? `/api/admin/workshops/${currentWorkshop.id}` : '/api/admin/workshops';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          images: uploadedImageUrls,
          sessions: modalWorkshopSessions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al ${currentWorkshop ? 'actualizar' : 'crear'} el taller.`);
      }

      alert(`Taller ${currentWorkshop ? 'actualizado' : 'creado'} correctamente.`);
      handleCloseModal();
      fetchWorkshops();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleDelete = async (workshopId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este taller? Esta acción es irreversible.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/workshops/${workshopId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo eliminar el taller.');
      }

      alert('Taller eliminado correctamente.');
      fetchWorkshops(); // Recargar la lista de talleres
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

  const handleToggleInscriptions = async (workshopId: string) => {
    const workshop = workshops.find(w => w.id === workshopId);
    if (!workshop) return;

    const newStatus = !workshop.inscriptionsOpen;
    if (!window.confirm(`¿Estás seguro de que quieres ${newStatus ? 'reabrir' : 'cerrar'} las inscripciones para este taller?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/workshops/${workshopId}/toggle-inscriptions`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo cambiar el estado de las inscripciones.');
      }

      alert(`Inscripciones ${newStatus ? 'abiertas' : 'cerradas'} correctamente.`);
      if (user && user.role === 'ADMIN_RESOURCE') {
        fetchWorkshops(searchTerm, user.id);
      } else {
        fetchWorkshops(searchTerm);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        alert(`Error al cambiar el estado: ${err.message}`);
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
            <h2>Gestión de Talleres</h2>
          </Col>
          <Col xs={12} className="text-center mt-3">
          <Row className="g-0 mb-2">
            <Col xs={6} className="px-1">
              <Button variant="primary" onClick={() => handleShowModal()} className="w-100 text-nowrap overflow-hidden text-truncate" style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>Añadir Nuevo Taller</Button>
            </Col>
            <Col xs={6} className="px-1">
              <Button
                variant="danger"
                onClick={handleBulkDelete}
                className="w-100 text-nowrap overflow-hidden text-truncate"
                disabled={selectedWorkshopIds.length === 0}
              >
                Eliminar Seleccionados ({selectedWorkshopIds.length})
              </Button>
            </Col>
            <Col xs={6} className="px-1">
              <Button variant="secondary" onClick={() => {
                const link = document.createElement('a');
                link.href = '/api/admin/export?model=workshops';
                link.setAttribute('download', 'Talleres_TuCeproa.csv'); // Suggest a filename
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }} className="w-100 text-nowrap overflow-hidden text-truncate">
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
              placeholder="Buscar talleres por nombre, descripción, maestro o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
        </Row>
      </div>

      {/* Desktop Layout */}
      <Row className="d-none d-md-flex align-items-center mb-3">
        <Col md={3} className="text-start">
          <h2>Gestión de Talleres</h2>
        </Col>
        <Col md={9} className="text-end">
          <div className="d-flex justify-content-end gap-2">
            <Form.Control
              type="text"
              placeholder="Buscar talleres por nombre, descripción, maestro o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 'auto' }} // Allow natural width
              className="me-2" // Add margin to the right of the search field
            />
            <Button variant="primary" onClick={() => handleShowModal()} style={{ backgroundColor: '#1577a5', borderColor: '#1577a5' }}>Añadir Nuevo Taller</Button>
            <Button
              variant="danger"
              onClick={handleBulkDelete}
              disabled={selectedWorkshopIds.length === 0}
            >
              Eliminar Seleccionados ({selectedWorkshopIds.length})
            </Button>
            <Button variant="secondary" onClick={() => {
              const link = document.createElement('a');
              link.href = '/api/admin/export?model=workshops';
              link.setAttribute('download', 'Talleres_TuCeproa.csv'); // Suggest a filename
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}>
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
                    checked={selectedWorkshopIds.length === workshops.length && workshops.length > 0}
                    disabled={workshops.length === 0}
                  />
                </th>
                <th>ID</th><th>Nombre</th><th>Responsable</th><th>Imágenes</th><th>Sesiones</th><th>Inscripciones</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {workshops.map(item => (
                <tr key={item.id}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      checked={selectedWorkshopIds.includes(item.id)}
                      onChange={(e) => handleSelectWorkshop(item.id, e.target.checked)}
                    />
                  </td>
                  <td>{item.displayId || item.id}</td>
                  <td>{item.name}</td>
                  <td>
                    {item.responsibleUser
                      ? `${item.responsibleUser.firstName} ${item.responsibleUser.lastName}`
                      : 'N/A'}
                  </td>
                  <td>
                    {item.images && item.images.length > 0 ? (
                      <div className="d-flex flex-wrap">
                        {item.images.map(img => (
                          <img key={img.id} src={img.url} alt="Workshop Image" width={50} height={50} style={{ objectFit: 'cover', margin: '2px' }} />
                        ))}
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    {item.sessions && item.sessions.length > 0 ? (
                      <ul>
                        {item.sessions.map((session, idx) => {
                          const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                          const dayName = days[session.dayOfWeek];
                          return (
                            <li key={idx}>
                              {dayName}: {session.timeStart} - {session.timeEnd} ({session.room || 'Sin aula'})
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      'Sin sesiones'
                    )}
                  </td>
                  <td>
                    <span className={`badge ${item.inscriptionsOpen ? 'bg-success' : 'bg-danger'}`}>
                      {item.inscriptionsOpen ? 'Abiertas' : 'Cerradas'}
                    </span>
                  </td>
                  <td>
                    <Button
                      variant={item.inscriptionsOpen ? 'danger' : 'success'}
                      size="sm"
                      className="me-2"
                      onClick={() => handleToggleInscriptions(item.id)}
                    >
                                          {item.inscriptionsOpen 
                        ? 'Cerrar' 
                        : new Date(item.inscriptionsStartDate || 0) < new Date() 
                        ? 'Reabrir' 
                        : 'Abrir'}

                    </Button>
                    <Button variant="warning" size="sm" className="me-2" onClick={() => handleShowModal(item)}>
                      Editar
                    </Button>
                    <a href={`/api/admin/workshops/${item.id}/inscriptions/pdf`} className="btn btn-success btn-sm me-2" target="_blank">
                      Descargar PDF
                    </a>
                    <Button variant="danger" size="sm" className="me-2" onClick={() => handleDelete(item.id)}>
                      Eliminar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleDuplicate(item)}>
                      Duplicar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="d-flex justify-content-center mt-3">
            <ButtonGroup>
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="outline-primary"
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                variant="outline-primary"
              >
                Siguiente
              </Button>
            </ButtonGroup>
          </div>
        </>
      )}

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{currentWorkshop ? 'Editar Taller' : 'Añadir Nuevo Taller'}</Modal.Title>
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
              {user.role === 'ADMIN_RESOURCE' ? (
                <Form.Control
                  type="text"
                  value={currentWorkshop ? `${currentWorkshop.responsibleUser?.firstName || ''} ${currentWorkshop.responsibleUser?.lastName || ''}`.trim() : (`${user.firstName || ''} ${user.lastName || ''}`).trim()}
                  readOnly
                  disabled
                />
              ) : responsibleUsersLoading ? (
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
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Capacidad</Form.Label>
              <Form.Control
                type="number"
                name="capacity"
                value={form.capacity}
                onChange={handleChange}
                placeholder="0"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Fecha de Inicio del Taller</Form.Label>
              <Form.Control
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Fecha de Fin del Taller</Form.Label>
              <Form.Control
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Fecha y Hora de Apertura de Inscripciones</Form.Label>
              <Form.Control
                type="datetime-local"
                name="inscriptionsStartDate"
                value={form.inscriptionsStartDate}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Maestro</Form.Label>
              <Form.Control
                type="text"
                name="teacher"
                value={form.teacher || ''}
                onChange={handleChange}
                placeholder="Nombre del Maestro"
              />
            </Form.Group>
            {/* Sección para añadir sesiones en el modal */}
            <Form.Group className="mb-3">
              <Form.Label>Sesiones Recurrentes</Form.Label>
              {modalWorkshopSessions.map((session, index) => (
                <Row key={index} className="mb-2 align-items-end">
                  <Col md={3}>
                    <Form.Label htmlFor={`modalDayOfWeek-${index}`} className="visually-hidden">Día de la Semana</Form.Label>
                    <Form.Select
                      id={`modalDayOfWeek-${index}`}
                      value={session.dayOfWeek}
                      onChange={(e) => handleModalSessionChange(index, 'dayOfWeek', parseInt(e.target.value))}
                      required
                    >
                      <option value="">Selecciona un día</option>
                      <option value={1}>Lunes</option>
                      <option value={2}>Martes</option>
                      <option value={3}>Miércoles</option>
                      <option value={4}>Jueves</option>
                      <option value={5}>Viernes</option>
                      <option value={6}>Sábado</option>
                      <option value={0}>Domingo</option>
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Label htmlFor={`modalTimeStart-${index}`} className="visually-hidden">Hora de Inicio</Form.Label>
                    <Form.Control
                      type="time"
                      id={`modalTimeStart-${index}`}
                      value={session.timeStart}
                      onChange={(e) => handleModalSessionChange(index, 'timeStart', e.target.value)}
                      required
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label htmlFor={`modalTimeEnd-${index}`} className="visually-hidden">Hora de Fin</Form.Label>
                    <Form.Control
                      type="time"
                      id={`modalTimeEnd-${index}`}
                      value={session.timeEnd}
                      onChange={(e) => handleModalSessionChange(index, 'timeEnd', e.target.value)}
                      required
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label htmlFor={`modalRoom-${index}`} className="visually-hidden">Aula</Form.Label>
                    <Form.Control
                      type="text"
                      id={`modalRoom-${index}`}
                      value={session.room || ''}
                      placeholder="Aula (opcional)"
                      onChange={(e) => handleModalSessionChange(index, 'room', e.target.value)}
                    />
                  </Col>
                  <Col md={1}>
                    <Button
                      variant="danger"
                      onClick={() => handleRemoveModalSession(index)}
                      disabled={modalWorkshopSessions.length === 1}
                    >
                      -
                    </Button>
                  </Col>
                </Row>
              ))}
              <Button variant="success" onClick={handleAddModalSession}>
                + Añadir Sesión
              </Button>
            </Form.Group>
            {error && <Alert variant="danger">{error}</Alert>}
            <Button variant="primary" type="submit" className="w-100">
              {currentWorkshop ? 'Guardar Cambios' : 'Crear Taller'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
