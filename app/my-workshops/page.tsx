'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';
import { Spinner, Alert, Container } from 'react-bootstrap';
import ResourceCard from '@/components/ResourceCard';

interface Image {
  id: string;
  url: string;
}

interface Inscription {
  id: string;
  workshop: {
    id: string;
    name: string;
    description: string | null;
    images: Image[];
    type: 'workshop';
  };
  createdAt: string;
}

export default function MyWorkshopsPage() {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const fetchInscriptions = async () => {
        try {
          const res = await fetch('/api/me/inscriptions');
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to fetch inscriptions');
          }
          const data: Inscription[] = await res.json();
          setInscriptions(data);
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
      fetchInscriptions();
    }
  }, [user, sessionLoading, router]);

  if (sessionLoading || loading) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando tus inscripciones...</p></Container>;
  }

  if (error) {
    return <Container className="mt-5"><Alert variant="danger">Error: {error}</Alert></Container>;
  }

  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <h2 style={{ color: '#0076A8' }}>Mis Talleres</h2>
      <hr />
      {inscriptions.length === 0 ? (
        <div className="text-center">
          <p>No estás inscrito en ningún taller.</p>
          <Link href="/workshops" className="btn btn-primary" style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>Explorar Talleres</Link>
        </div>
      ) : (
        <div className="row">
          {inscriptions.map(({ workshop }) => (
            <div key={workshop.id} className="col-5-per-row mb-4">
              <ResourceCard resource={{...workshop, type: 'workshop'}} type="workshop" displayMode="detailsOnly" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
