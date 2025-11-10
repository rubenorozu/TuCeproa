'use client';

import { useState, useEffect } from 'react';
import ResourceCard from '@/components/ResourceCard';
import { Spinner, Form, Modal, Button, Alert, FormCheck } from 'react-bootstrap';
import { useCart } from '@/context/CartContext'; // Import useCart

interface Image {
  id: string;
  url: string;
}

interface Resource {
  id: string;
  name: string;
  description?: string | null;
  images: Image[];
  type: 'space' | 'equipment';
  reservationLeadTime?: number | null;
  isFixedToSpace?: boolean;
  requiresSpaceReservationWithEquipment?: boolean; // NEW: Add this field
  _count?: {
    equipments?: number;
  };
}

export default function ReservationsPage() {
  const { addToCart } = useCart(); // Destructure addToCart here
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<'all' | 'space' | 'equipment'>('all');
  const [searchTerm, setSearchTerm] = useState(''); // Nuevo estado para el término de búsqueda
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // Estado de carga
  const [showSpaceConfigModal, setShowSpaceConfigModal] = useState(false);
  const [configuringSpaceId, setConfiguringSpaceId] = useState<string | null>(null);
  const [configuringSpaceName, setConfiguringSpaceName] = useState<string | null>(null);
  const [spaceEquipment, setSpaceEquipment] = useState<Resource[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  useEffect(() => {
    const fetchResources = async (searchQuery: string = '') => {
      setLoading(true); // Iniciar carga
      try {
        const [spacesRes, equipmentRes] = await Promise.all([
          fetch(`/api/spaces?search=${searchQuery}`),
          fetch(`/api/equipment?search=${searchQuery}`),
        ]);

        let resources: Resource[] = [];
        if (spacesRes.ok) {
          const spaces = await spacesRes.json();
          console.log('DEBUG: API /api/spaces response:', spaces);
          resources = [...resources, ...spaces.map((s: any) => ({...s, type: 'space', images: s.images || [], requiresSpaceReservationWithEquipment: s.requiresSpaceReservationWithEquipment}))];
        } else {
          const errorData = await spacesRes.json();
          setError(`No se pudieron cargar los espacios: ${errorData.error || spacesRes.statusText}`);
          console.error('DEBUG: Error al cargar espacios:', errorData);
        }
        if (equipmentRes.ok) {
          const equipment = await equipmentRes.json();
          console.log('DEBUG: API /api/equipment response:', equipment);
          resources = [...resources, ...equipment.map((e: any) => ({...e, type: 'equipment', images: e.images || [], reservationLeadTime: e.reservationLeadTime, isFixedToSpace: e.isFixedToSpace}))];
        } else {
          const errorData = await equipmentRes.json();
          setError(prev => prev + ` | No se pudieron cargar los equipos: ${errorData.error || equipmentRes.statusText}`);
          console.error('DEBUG: Error al cargar equipos:', errorData);
        }
        setAllResources(resources);
      } catch (err) {
        setError('Error al conectar con el servidor.');
      } finally {
        setLoading(false); // Finalizar carga
      }
    };

    const handler = setTimeout(() => {
      fetchResources(searchTerm);
    }, 500); // Debounce por 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);


  const handleConfigureSpace = async (spaceId: string) => {
    const space = allResources.find(r => r.id === spaceId && r.type === 'space');
    if (!space) return;

    setConfiguringSpaceId(spaceId);
    setConfiguringSpaceName(space.name);
    setLoading(true); // Set loading for equipment fetch
    try {
      const res = await fetch(`/api/spaces/${spaceId}/equipment`);
      if (!res.ok) {
        throw new Error('Error al cargar equipos del espacio.');
      }
      const equipmentData: Resource[] = await res.json();
      setSpaceEquipment(equipmentData);
      // Pre-select fixed equipment if the space requires reservation with equipment
      // Otherwise, no equipment is pre-selected by default
      setSelectedEquipment(equipmentData.filter(eq => space.requiresSpaceReservationWithEquipment && eq.isFixedToSpace).map(eq => eq.id));
      setShowSpaceConfigModal(true);
    } catch (err: any) {
      setError(err.message || 'Error al cargar equipos del espacio.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSpaceConfigModal = () => {
    setShowSpaceConfigModal(false);
    setConfiguringSpaceId(null);
    setConfiguringSpaceName(null);
    setSpaceEquipment([]);
    setSelectedEquipment([]);
  };

  const handleToggleEquipmentSelection = (equipmentId: string) => {
    setSelectedEquipment(prev =>
      prev.includes(equipmentId) ? prev.filter(id => id !== equipmentId) : [...prev, equipmentId]
    );
  };

  const handleAddSpaceAndEquipmentToCart = () => {
    if (!configuringSpaceId) return;

    const space = allResources.find(r => r.id === configuringSpaceId && r.type === 'space');
    if (!space) return;

    // If the space requires reservation with equipment (e.g., TV Studio)
    if (space.requiresSpaceReservationWithEquipment) {
      addToCart(space); // Add the space itself
      spaceEquipment.forEach(eq => {
        if (eq.isFixedToSpace || selectedEquipment.includes(eq.id)) { // Add fixed equipment automatically, and non-fixed if selected
          addToCart(eq);
        }
      });
    } else { // If the space does NOT require reservation with equipment (e.g., Software Room)
      spaceEquipment.forEach(eq => {
        if (selectedEquipment.includes(eq.id)) { // Only add explicitly selected equipment
          addToCart(eq);
        }
      });
    }

    handleCloseSpaceConfigModal();
  };

  const filteredResources = allResources.filter(resource => {
    if (filter === 'all') return true;
    return resource.type === filter;
  });

  return (
    <div className="container" style={{ paddingTop: '80px' }}>
                  <div className="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center mb-4">              <h2 style={{ color: '#0076A8' }} className="mb-3 mb-md-0 text-center text-md-start w-100 w-md-auto">Recursos Disponibles</h2>
                      <div className="d-flex flex-column flex-md-row align-items-center w-100 w-md-auto">                <Form.Control
                  type="text"
                  placeholder="Buscar recursos por nombre, descripción o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%' }} /* Make search full width on mobile */
                  className="mb-3 mb-md-0 me-md-3" /* Add margin bottom on mobile, right on desktop */
                />
                          <div className="btn-group w-100 w-md-auto">            <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('all')}>Todos</button>
            <button className={`btn ${filter === 'space' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('space')}>Espacios</button>
            <button className={`btn ${filter === 'equipment' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('equipment')}>Equipos</button>
          </div>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <hr />
            <div className="row mx-auto">
          {loading ? (
            <div className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </Spinner>
            </div>
          ) : filteredResources.length > 0 ? (
            filteredResources.map(resource => (
              console.log('DEBUG: Passing resource to ResourceCard:', resource),
              <div className="col-5-per-row mb-2" key={resource.id}>
                <ResourceCard resource={resource} type={resource.type} onConfigureSpace={handleConfigureSpace} />
              </div>
            ))
          ) : (
            <p>No hay recursos que coincidan con el filtro.</p>
          )}
    </div>
      <Modal show={showSpaceConfigModal} onHide={handleCloseSpaceConfigModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Configurar Reserva para: {configuringSpaceName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <div className="text-center"><Spinner animation="border" /><p>Cargando equipos...</p></div>
          ) : spaceEquipment.length === 0 ? (
            <Alert variant="info">No hay equipos asociados a este espacio o todos están en mantenimiento.</Alert>
          ) : (
            <>
              <p>Selecciona los equipos que deseas incluir con este espacio:</p>
              {spaceEquipment.map(eq => (
                <Form.Check
                  key={eq.id}
                  type="checkbox"
                  id={`equipment-${eq.id}`}
                  label={`${eq.name} ${eq.isFixedToSpace ? '(Fijo al espacio)' : ''}`}
                  checked={selectedEquipment.includes(eq.id)}
                  onChange={() => handleToggleEquipmentSelection(eq.id)}
                  // disabled={eq.isFixedToSpace} // Fixed equipment can now be deselected
                />
              ))}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseSpaceConfigModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleAddSpaceAndEquipmentToCart} disabled={loading}>
            Agregar al Carrito
          </Button>
        </Modal.Footer>
      </Modal>
  </div>
  );
}