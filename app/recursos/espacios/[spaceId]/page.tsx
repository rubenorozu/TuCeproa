'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ResourceCard from '@/components/ResourceCard';
import { Spinner } from 'react-bootstrap';

// Define types based on what the API will return
interface Image {
  id: string;
  url: string;
}

interface Equipment {
  id: string;
  name: string;
  description?: string | null;
  images: Image[];
  type: 'equipment';
}

interface Space {
    id: string;
    name: string;
}

export default function SpaceEquipmentPage() {
  const params = useParams();
  const spaceId = params.spaceId as string;

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!spaceId) return;

    const fetchSpaceDetails = async () => {
        try {
            const res = await fetch(`/api/spaces/${spaceId}`);
            if (!res.ok) throw new Error('No se pudo cargar la información del espacio.');
            const data = await res.json();
            setSpace(data);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const fetchEquipmentInSpace = async () => {
      try {
        const res = await fetch(`/api/recursos/espacios/${spaceId}/equipment`);
        if (!res.ok) throw new Error('No se pudieron cargar los equipos de este espacio.');
        const data = await res.json();
        console.log('--- FRONTEND: Received equipment data ---', data);
        setEquipment(data.map((e: any) => ({ ...e, type: 'equipment' })));
      } catch (err: any) {
        setError(err.message);
      }
    };

    const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchSpaceDetails(), fetchEquipmentInSpace()]);
        setLoading(false);
    }

    loadData();
  }, [spaceId]);

  return (
    <div className="container" style={{ paddingTop: '80px' }}>
      <h2 style={{ color: '#0076A8' }} className="mb-4 text-center text-md-start">
        {loading ? 'Cargando...' : `Equipos en ${space?.name || 'Espacio'}`}
      </h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <hr />
      <div className="row mx-auto">
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
          </div>
        ) : equipment.length > 0 ? (
          equipment.map(resource => (
            <div className="col-5-per-row mb-2" key={resource.id}>
              <ResourceCard resource={resource} type="equipment" />
            </div>
          ))
        ) : (
          <p>No hay equipos asignados a este espacio.</p>
        )}
      </div>
    </div>
  );
}
