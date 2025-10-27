'use client';

import { useState, useEffect } from 'react';
import { Container, Spinner, Alert, Form } from 'react-bootstrap';
import { useSession } from '@/context/SessionContext';
import ResourceCard from '@/components/ResourceCard';

interface Image {
  id: string;
  url: string;
}

interface Workshop {
  id: string;
  name: string;
  description: string | null;
  images: Image[];
  type: 'workshop';
  capacity?: number;
  inscriptionsStartDate?: string | null;
  inscriptionsOpen?: boolean;
  _count?: {
    inscriptions: number;
  };
}

interface Inscription {
  workshopId: string;
  status: string; // Adjust this type if a more specific enum is available
}

export default function WorkshopsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [refresh, setRefresh] = useState(false);

  const triggerRefresh = () => setRefresh(prev => !prev);

  useEffect(() => {
    if (sessionLoading) {
      return; // Espera a que la sesión esté lista
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchPromises: [Promise<Response>, Promise<Response>?] = [
          fetch(`/api/workshops?search=${searchTerm}`, { cache: 'no-store' }),
        ];
        if (user) {
          fetchPromises.push(fetch('/api/me/inscriptions'));
        }

        const [workshopsRes, inscriptionsRes] = await Promise.all(fetchPromises);

        if (!workshopsRes.ok) {
          const errorData = await workshopsRes.json();
          throw new Error(errorData.error || 'Error al cargar los talleres.');
        }

        const workshopsData = await workshopsRes.json();
        setWorkshops(workshopsData.map((w: Workshop) => ({ ...w, type: 'workshop' })));

        if (inscriptionsRes && inscriptionsRes.ok) {
          const inscriptionsData = await inscriptionsRes.json();
          setInscriptions(inscriptionsData);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    // Debounce logic for searchTerm
    const handler = setTimeout(() => {
      fetchData();
    }, searchTerm ? 500 : 0);

    return () => clearTimeout(handler);
  }, [sessionLoading, user, refresh, searchTerm]);

  if (loading || sessionLoading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
        <p>Cargando talleres...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container style={{ paddingTop: '100px' }}>
      <h2 style={{ color: '#0076A8' }} className="mb-3">Talleres Disponibles</h2>
      <Form.Control
        type="text"
        placeholder="Buscar talleres..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        style={{ width: '100%' }}
        className="mb-4"
      />
      {workshops.length === 0 ? (
        <Alert variant="info">No hay talleres disponibles en este momento.</Alert>
      ) : (
        <div className="row mx-auto">
          {workshops.map(workshop => {
            const inscription = inscriptions.find(i => i.workshopId === workshop.id);
            return (
              <div key={workshop.id} className="col-4-per-row mb-4">
                <ResourceCard
                  resource={{ ...workshop, inscriptionStatus: inscription?.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined }}
                  type="workshop"
                  onInscriptionSuccess={triggerRefresh}
                />
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
}
