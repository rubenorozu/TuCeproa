'use client';

import { useState, useEffect } from 'react';
import Hero from '@/components/Hero';
import Carousel from '@/components/Carousel';

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
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<'all' | 'space' | 'equipment'>('all');

  useEffect(() => {
    const fetchResources = async () => {
      const [spacesRes, equipmentRes] = await Promise.all([
        fetch('/api/spaces'),
        fetch('/api/equipment'),
      ]);

      let resources: Resource[] = [];
      if (spacesRes.ok) {
        const spaces = await spacesRes.json();
        resources = [...resources, ...spaces.map((s: Resource) => ({...s, images: s.images || [], type: 'space'}))];
      }
      if (equipmentRes.ok) {
        const equipment = await equipmentRes.json();
        resources = [...resources, ...equipment.map((e: Resource) => ({...e, images: e.images || [], type: 'equipment'}))];
      }
      setAllResources(shuffleArray(resources));
    };
    fetchResources();
  }, []);

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
          
          <Carousel resources={filteredResources} />
        </div>


      </div>
    </div>
  );
}

