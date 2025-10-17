'use client';

import { useState, useEffect } from 'react';
import ResourceCard from '@/components/ResourceCard';
import { Spinner, Form } from 'react-bootstrap'; // Importar Spinner y Form

interface Resource {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  type: 'space' | 'equipment';
}

export default function ReservationsPage() {
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<'all' | 'space' | 'equipment'>('all');
  const [searchTerm, setSearchTerm] = useState(''); // Nuevo estado para el término de búsqueda
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // Estado de carga

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
          resources = [...resources, ...spaces.map((s: Resource) => ({...s, type: 'space'}))];
        } else {
          setError('No se pudieron cargar los espacios.');
        }
        if (equipmentRes.ok) {
          const equipment = await equipmentRes.json();
          resources = [...resources, ...equipment.map((e: Resource) => ({...e, type: 'equipment'}))];
        } else {
          setError(prev => prev + ' No se pudieron cargar los equipos.');
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

  const filteredResources = allResources.filter(resource => {
    if (filter === 'all') return true;
    return resource.type === filter;
  });

  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ color: '#0076A8' }}>Recursos Disponibles</h2>
        <div className="d-flex align-items-center">
          <Form.Control
            type="text"
            placeholder="Buscar recursos por nombre, descripción o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '250px' }}
            className="me-3"
          />
          <div className="btn-group">
            <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('all')} style={filter === 'all' ? { backgroundColor: '#0076A8', borderColor: '#0076A8' } : { color: '#0076A8', borderColor: '#0076A8' }}>Todos</button>
            <button className={`btn ${filter === 'space' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('space')} style={filter === 'space' ? { backgroundColor: '#0076A8', borderColor: '#0076A8' } : { color: '#0076A8', borderColor: '#0076A8' }}>Espacios</button>
            <button className={`btn ${filter === 'equipment' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('equipment')} style={filter === 'equipment' ? { backgroundColor: '#0076A8', borderColor: '#0076A8' } : { color: '#0076A8', borderColor: '#0076A8' }}>Equipos</button>
          </div>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <hr />
      <div className="row">
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
          </div>
        ) : filteredResources.length > 0 ? (
          filteredResources.map(resource => (
            <div className="col-5-per-row mb-4" key={resource.id}>
              <ResourceCard resource={resource} type={resource.type} />
            </div>
          ))
        ) : (
          <p>No hay recursos que coincidan con el filtro.</p>
        )}
      </div>
    </div>
  );
}