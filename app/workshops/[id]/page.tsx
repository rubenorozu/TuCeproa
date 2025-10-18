'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Spinner, Alert, Carousel, Button } from 'react-bootstrap';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

interface Image {
  id: string;
  url: string;
}

interface Workshop {
  id: string;
  name: string;
  description: string | null;
  images: Image[];
  responsibleUserId: string | null;
  createdAt: string;
  updatedAt: string;
  responsibleUser?: { name: string | null; email: string };
}

export default function WorkshopDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchWorkshop = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`DEBUG: Fetching workshop with ID: ${id} from /api/workshops/${id}`);
        const response = await fetch(`/api/workshops/${id}`); // Usar la API pública
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar el taller.');
        }
        const data: Workshop = await response.json();
        setWorkshop(data);
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
    fetchWorkshop();
  }, [id]);

  if (loading) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando taller...</p></Container>;
  }

  if (error) {
    return <Container className="mt-5"><Alert variant="danger">Error: {error}</Alert></Container>;
  }

  if (!workshop) {
    return <Container className="mt-5"><Alert variant="warning">Taller no encontrado.</Alert></Container>;
  }

  return (
    <Container style={{ paddingTop: '100px' }}>
            {workshop.images && workshop.images.length > 0 ? (
        <Carousel interval={null} indicators={false} className="mb-4">
          {workshop.images.map((img, idx) => (
            <Carousel.Item key={img.id || idx}>
              <div style={{ position: 'relative', width: '100%', height: '500px' }}>
                <Image
                  src={img.url}
                  alt={`Imagen de ${workshop.name} ${idx + 1}`}
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </Carousel.Item>
          ))}
        </Carousel>
      ) : (
        <div style={{ position: 'relative', width: '100%', height: '500px' }} className="mb-4">
          <Image
            src="/placeholder.svg"
            alt="No Image"
            fill
            style={{ objectFit: 'contain' }}
          />
        </div>
      )}

      <h2>{workshop.name}</h2>
      <p><strong>Descripción:</strong> {workshop.description || 'Sin descripción.'}</p>
      <p><strong>Responsable:</strong> {workshop.responsibleUser?.name || workshop.responsibleUser?.email || 'N/A'}</p>
      <p><strong>Creado:</strong> {new Date(workshop.createdAt).toLocaleDateString()}</p>

      <Link href="/workshops" passHref legacyBehavior>
        <Button variant="secondary" className="w-100 mt-2">Volver a Talleres</Button>
      </Link>
    </Container>
  );
}
