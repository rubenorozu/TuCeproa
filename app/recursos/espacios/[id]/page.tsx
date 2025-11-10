'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Container, Spinner, Alert, Button, FormCheck } from 'react-bootstrap';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import ReportModal from '@/components/ReportModal'; // Import ReportModal

interface Image {
  id: string;
  url: string;
}

interface SpaceDetail {
  id: string;
  name: string;
  description?: string | null;
  images: Image[];
  reservationLeadTime?: number | null;
  requiresSpaceReservationWithEquipment?: boolean; // NEW: Add this field
}

interface EquipmentResource {
  id: string;
  name: string;
  description?: string | null;
  images: Image[];
  type: 'equipment';
  reservationLeadTime?: number | null;
  isFixedToSpace?: boolean;
}

export default function SpaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const [space, setSpace] = useState<SpaceDetail | null>(null);
  const [spaceEquipment, setSpaceEquipment] = useState<EquipmentResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false); // State for ReportModal

  // Fetch space details and associated equipment
  useEffect(() => {
    if (!id) return;

    const fetchSpaceData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch space details
        const spaceRes = await fetch(`/api/spaces/${id}`);
        if (!spaceRes.ok) {
          throw new Error('Error al cargar los detalles del espacio.');
        }
        const spaceData: SpaceDetail = await spaceRes.json();
        setSpace(spaceData);

        // Fetch associated equipment
        const equipmentRes = await fetch(`/api/spaces/${id}/equipment`);
        if (!equipmentRes.ok) {
          throw new Error('Error al cargar los equipos asociados.');
        }
        const equipmentData: EquipmentResource[] = await equipmentRes.json();
        setSpaceEquipment(equipmentData);

        // Pre-select fixed equipment if the space requires reservation with equipment
        setSelectedEquipment(equipmentData.filter(eq => spaceData.requiresSpaceReservationWithEquipment && eq.isFixedToSpace).map(eq => eq.id));

      } catch (err: any) {
        setError(err.message || 'Error desconocido al cargar el espacio y sus equipos.');
      } finally {
        setLoading(false);
      }
    };

    fetchSpaceData();
  }, [id]);

  const handleToggleEquipmentSelection = (equipmentId: string) => {
    setSelectedEquipment(prev =>
      prev.includes(equipmentId) ? prev.filter(item => item !== equipmentId) : [...prev, equipmentId]
    );
  };

  const handleAddSpaceAndEquipmentToCart = () => {
        if (!space) return;
    
        setIsAddingToCart(true);
        // If the space requires reservation with equipment, add the space itself.
        if (space.requiresSpaceReservationWithEquipment) {
          addToCart({ 
            id: space.id, 
            name: space.name, 
            type: 'space', 
            description: space.description, 
            images: space.images,
            reservationLeadTime: space.reservationLeadTime
          });
        }
        
        // Add only the selected equipment
        spaceEquipment.forEach(eq => {
          if (selectedEquipment.includes(eq.id)) {
            addToCart({
              id: eq.id,
              name: eq.name,
              type: 'equipment',
              description: eq.description,
              images: eq.images,
              reservationLeadTime: eq.reservationLeadTime,
              isFixedToSpace: eq.isFixedToSpace
            });
          }
        });
    
        // Determine the appropriate alert message based on space type and selected equipment
        let alertMessage: string;
        if (!space.requiresSpaceReservationWithEquipment) {
          // Case 2: Individual equipment from a container space (e.g., computer lab)
          alertMessage = 'Equipo añadido al carrito.';
        } else {
          // Case 1: Space with optional equipment (e.g., TV studio)
          if (selectedEquipment.length === 0) {
            // Only the space was added (no equipment selected)
            alertMessage = 'Espacio añadido al carrito.';
          } else {
            // Space and some equipment were added
            alertMessage = 'Espacio y equipos añadidos al carrito.';
          }
        }
    
        alert(alertMessage);
        setIsAddingToCart(false);  };

  if (loading) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando detalles del espacio...</p></Container>;
  }

  if (error) {
    return <Container className="mt-5"><Alert variant="danger">{error}</Alert></Container>;
  }

  if (!space) {
    return <Container className="mt-5"><Alert variant="warning">Espacio no encontrado.</Alert></Container>;
  }

  const imageUrlToDisplay = space.images && space.images.length > 0 ? space.images[0].url : '/placeholder.svg';

  return (
    <Container style={{ paddingTop: '100px' }}>
      <Link href="/recursos" className="btn btn-outline-secondary mb-4">← Volver a Recursos</Link>
      <h1 className="mb-4">{space.name}</h1>
      <div className="mb-4">
        <img src={imageUrlToDisplay} alt={space.name} className="img-fluid rounded" style={{ maxHeight: '400px', objectFit: 'cover', width: '100%' }} />
      </div>
      <p>{space.description}</p>
      {space.reservationLeadTime !== null && (
        <p><strong>Tiempo de Antelación de Reserva:</strong> {space.reservationLeadTime} horas</p>
      )}

      {spaceEquipment.length > 0 && (
        <div className="mt-5 p-4 border rounded shadow-sm">
          <h3>Equipos disponibles en este espacio:</h3>
          <p>Selecciona los equipos que deseas incluir con este espacio:</p>
          {spaceEquipment.map(eq => (
            <FormCheck
              key={eq.id}
              type="checkbox"
              id={`equipment-${eq.id}`}
              label={`${eq.name} ${eq.isFixedToSpace ? '(Fijo al espacio)' : ''}`}
              checked={selectedEquipment.includes(eq.id)}
              onChange={() => handleToggleEquipmentSelection(eq.id)}
            />
          ))}
          <div className="d-flex justify-content-end mt-3">
            <Button variant="primary" onClick={handleAddSpaceAndEquipmentToCart} disabled={isAddingToCart || loading} className="me-2">
              {isAddingToCart ? 'Añadiendo al Carrito...' : 'Agregar Espacio y Equipos al Carrito'}
            </Button>
            <Button variant="outline-danger" onClick={() => setShowReportModal(true)}>
              Reportar un problema
            </Button>
          </div>
        </div>
      )}

      {spaceEquipment.length === 0 && (
        <div className="d-flex justify-content-end mt-3">
          <Button variant="outline-danger" onClick={() => setShowReportModal(true)}>
            Reportar un problema
          </Button>
        </div>
      )}

      {space && (
        <ReportModal
          show={showReportModal}
          handleClose={() => setShowReportModal(false)}
          resourceId={space.id}
          resourceType="space"
        />
      )}
    </Container>
  );
}