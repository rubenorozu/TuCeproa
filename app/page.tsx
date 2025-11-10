'use client';

import { useState, useEffect } from 'react';
import Hero from '@/components/Hero';
import Carousel from '@/components/Carousel';
import { Modal, Button, Alert, FormCheck, Spinner } from 'react-bootstrap'; // NEW: Import Modal and other components
import { useCart } from '@/context/CartContext'; // NEW: Import useCart

interface Image {
  id: string;
  url: string;
}

interface Resource {
  id: string;
  name: string;
  description?: string | null;
  images: Image[]; // Cambiado a array de Image
  type: 'space' | 'equipment';
  reservationLeadTime?: number | null; // NEW: Add reservationLeadTime
  isFixedToSpace?: boolean; // NEW: Add isFixedToSpace
  _count?: { // NEW: Add _count for equipments
    equipments?: number;
  };
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array: Resource[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default function Home() {
  const { addToCart } = useCart(); // Destructure addToCart here
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<'all' | 'space' | 'equipment'>('all');
  const [error, setError] = useState(''); // NEW: Add error state
  const [loading, setLoading] = useState(true); // NEW: Add loading state for equipment fetch
  const [showSpaceConfigModal, setShowSpaceConfigModal] = useState(false);
  const [configuringSpaceId, setConfiguringSpaceId] = useState<string | null>(null);
  const [configuringSpaceName, setConfiguringSpaceName] = useState<string | null>(null);
  const [spaceEquipment, setSpaceEquipment] = useState<Resource[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [isSingleSelection, setIsSingleSelection] = useState(false);

  useEffect(() => {
    const fetchResources = async () => {
      const [spacesRes, equipmentRes] = await Promise.all([
        fetch('/api/spaces', { cache: 'no-store' }),
        fetch('/api/equipment', { cache: 'no-store' }),
      ]);

      let resources: Resource[] = [];
      if (spacesRes.ok) {
        const spaces = await spacesRes.json();
        resources = [...resources, ...spaces.map((s: Resource) => ({...s, images: s.images || [], type: 'space'}))];
      }
      if (equipmentRes.ok) {
        const equipment = await equipmentRes.json();
        resources = [...resources, ...equipment.map((e: Resource) => ({...e, images: e.images || [], type: 'equipment', reservationLeadTime: e.reservationLeadTime, isFixedToSpace: e.isFixedToSpace}))];
      }
      setAllResources(shuffleArray(resources));
    };
    fetchResources();
  }, []);

  const handleConfigureSpace = async (spaceId: string) => {
    const space = allResources.find(r => r.id === spaceId && r.type === 'space');
    if (!space) return;

    setConfiguringSpaceId(spaceId);
    setConfiguringSpaceName(space.name);
    setIsSingleSelection(!space.requiresSpaceReservationWithEquipment);
    setLoading(true); // Set loading for equipment fetch
    try {
      const res = await fetch(`/api/spaces/${spaceId}/equipment`);
      if (!res.ok) {
        throw new Error('Error al cargar equipos del espacio.');
      }
      const equipmentData: Resource[] = await res.json();
      setSpaceEquipment(equipmentData);
      // Pre-select fixed equipment if the space requires reservation with equipment
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
    if (isSingleSelection) {
      setSelectedEquipment([equipmentId]);
    } else {
      setSelectedEquipment(prev =>
        prev.includes(equipmentId) ? prev.filter(id => id !== equipmentId) : [...prev, equipmentId]
      );
    }
  };

  const handleAddSpaceAndEquipmentToCart = () => {
    if (!configuringSpaceId) return;

    const space = allResources.find(r => r.id === configuringSpaceId && r.type === 'space');
    if (space && space.requiresSpaceReservationWithEquipment) {
      // Add the space itself if it requires reservation with equipment
      addToCart(space);
    }

    // Add selected equipment
    spaceEquipment.forEach(eq => {
      if (selectedEquipment.includes(eq.id)) {
        addToCart(eq);
      }
    });

    handleCloseSpaceConfigModal();
  };

  const filteredResources = allResources.filter(resource => {
    if (filter === 'all') return true;
    return resource.type === filter;
  });

  return (
    <div style={{ paddingTop: '80px' }}>
      <div className="container">
        <Hero />

        <div className="mt-4">
          <div className="d-flex flex-column flex-md-row justify-content-center justify-content-md-between align-items-center mb-3">
            <h2 style={{ color: '#0076A8' }} className="mb-2 mb-md-0">Recursos disponibles</h2>
            <div className="btn-group">
                <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('all')} style={filter === 'all' ? { backgroundColor: '#0076A8', borderColor: '#0076A8' } : { color: '#0076A8', borderColor: '#0076A8' }}>Todos</button>
                <button className={`btn ${filter === 'space' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('space')} style={filter === 'space' ? { backgroundColor: '#0076A8', borderColor: '#0076A8' } : { color: '#0076A8', borderColor: '#0076A8' }}>Espacios</button>
                <button className={`btn ${filter === 'equipment' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('equipment')} style={filter === 'equipment' ? { backgroundColor: '#0076A8', borderColor: '#0076A8' } : { color: '#0076A8', borderColor: '#0076A8' }}>Equipos</button>
            </div>
          </div>
          
          <Carousel resources={filteredResources} onConfigureSpace={handleConfigureSpace} />
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
                  <FormCheck
                    key={eq.id}
                    type={isSingleSelection ? 'radio' : 'checkbox'}
                    id={`equipment-${eq.id}`}
                    label={`${eq.name} ${eq.isFixedToSpace ? '(Fijo al espacio)' : ''}`}
                    checked={selectedEquipment.includes(eq.id)}
                    onChange={() => handleToggleEquipmentSelection(eq.id)}
                    name="equipmentSelection"
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
    </div>
  );
}

