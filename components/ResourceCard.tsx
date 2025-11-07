'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
// import Image from 'next/image'; // Reemplazado por <img> estándar
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import styles from './ResourceCard.module.css';

interface Inscription {
  workshopId: string;
  status: string;
}

interface Image {
  id: string;
  url: string;
}

interface Resource {
  id: string;
  name: string;
  description?: string | null;
  images: Image[];
  type: 'space' | 'equipment' | 'workshop';
  capacity?: number;
  inscriptionsStartDate?: string | null;
  inscriptionsOpen?: boolean;
  inscriptionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  _count?: {
    inscriptions: number;
    equipments?: number;
  };
}

interface Props {
  resource: Resource;
  type: 'space' | 'equipment' | 'workshop';
  displayMode?: 'full' | 'detailsOnly' | 'none';
  onInscriptionSuccess?: () => void;
}

const ResourceCard = ({ resource, type, displayMode = 'full', onInscriptionSuccess }: Props) => {
  console.log('--- ResourceCard: resource prop ---', resource);
  const { addToCart } = useCart();
  const { user } = useSession();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [inscriptionStatus, setInscriptionStatus] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(false);

  console.log(`ResourceCard render for ${resource.name} - user:`, user, 'inscriptionStatus state:', inscriptionStatus);

  useEffect(() => {
    console.log(`ResourceCard useEffect for ${resource.name} - user:`, user, 'type:', type, 'resource.id:', resource.id, 'refresh:', refresh);
    if (type !== 'workshop' || !user) {
      console.log(`ResourceCard useEffect for ${resource.name} - Skipping fetch: Not a workshop or no user.`);
      setInscriptionStatus(null);
      return;
    }

    const fetchInscriptionStatus = async () => {
      console.log(`ResourceCard fetchInscriptionStatus for ${resource.name} - Fetching...`);
      try {
        const res = await fetch(`/api/me/inscriptions`);
        if (res.ok) {
          const inscriptions = await res.json();
          console.log(`ResourceCard fetchInscriptionStatus for ${resource.name} - Fetched inscriptions:`, inscriptions);
          const currentInscription = inscriptions.find((i: Inscription) => i.workshopId === resource.id);
          console.log(`ResourceCard fetchInscriptionStatus for ${resource.name} - Current inscription:`, currentInscription);
          if (currentInscription) {
            setInscriptionStatus(currentInscription.status);
            console.log(`ResourceCard fetchInscriptionStatus for ${resource.name} - Set inscriptionStatus to:`, currentInscription.status);
          } else {
            setInscriptionStatus(null);
            console.log(`ResourceCard fetchInscriptionStatus for ${resource.name} - Set inscriptionStatus to: null (no inscription found)`);
          }
        } else {
          console.error(`ResourceCard fetchInscriptionStatus for ${resource.name} - Failed to fetch inscriptions:`, res.status, res.statusText);
          setInscriptionStatus(null);
        }
      } catch (error) {
        console.error(`ResourceCard fetchInscriptionStatus for ${resource.name} - Error fetching inscription status:`, error);
        setInscriptionStatus(null);
      }
    };

    fetchInscriptionStatus();
  }, [user, resource.id, type, refresh]);

  const handleInscribe = async (isExtraordinary = false) => {
    setIsSubscribing(true);
    try {
      const res = await fetch(`/api/workshops/inscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId: resource.id, isExtraordinary }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('¡Solicitud de inscripción enviada!');
        if (onInscriptionSuccess) {
          onInscriptionSuccess();
        }
        setRefresh(prev => !prev);
      } else {
        if (data.limitReached) {
          if (window.confirm(data.error + '\n\n¿Deseas enviar una solicitud de inscripción extraordinaria?')) {
            handleInscribe(true);
          }
        } else {
          alert(data.error || 'No se pudo realizar la inscripción.');
        }
        if (res.status === 409) {
          setRefresh(prev => !prev);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`Error: ${error.message}`);
      } else {
        alert('An unknown error occurred');
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const isAvailable =
    resource.type !== 'workshop' ||
    !resource.inscriptionsStartDate ||
    new Date(resource.inscriptionsStartDate) <= new Date();

  const isFull =
    resource.type === 'workshop' &&
    resource.capacity != null &&
    resource._count != null &&
    resource.capacity > 0 &&
    resource._count.inscriptions >= resource.capacity;

  const areInscriptionsOpen = resource.type !== 'workshop' || (resource.inscriptionsOpen ?? true);

  const imageUrlToDisplay =
    resource.images && resource.images.length > 0 ? resource.images[0].url : '/placeholder.svg';

  const resourceUrl = (type === 'space' && resource._count?.equipments && resource._count.equipments > 0)
    ? `/recursos/espacios/${resource.id}`
    : `/recursos/${resource.id}?type=${type}`;

  return (
    <div className="card h-100 shadow-sm">
      <div style={{ position: 'relative', width: '100%', height: '150px' }}>
        <img
          src={imageUrlToDisplay}
          alt={resource.name}
          className="card-img-top"
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      </div>
      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{resource.name}</h5>
        <p className="card-text text-muted flex-grow-1 text-truncate-multiline text-justify">
          {resource.description}
        </p>
        {displayMode !== 'none' && (
          <div className="mt-auto w-100">
            {displayMode === 'detailsOnly' && (
              <Link
                href={resourceUrl}
                className="btn btn-primary w-100"
                style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}
              >
                Ver Detalles
              </Link>
            )}
            {displayMode === 'full' && (
              <div className="d-grid gap-2 d-md-flex w-100">
                <Link
                  href={resourceUrl}
                  className={`btn ${styles.customPrimaryButton} flex-fill`}
                >
                  Ver más
                </Link>
                {type === 'workshop' ? (
                  <button
                    className={`btn btn-warning text-white ${ 
                      !isAvailable ||
                      isFull ||
                      !areInscriptionsOpen ||
                      isSubscribing ||
                      inscriptionStatus === 'PENDING' ||
                      inscriptionStatus === 'APPROVED'
                        ? 'disabled'
                        : ''
                    }`}
                    style={{
                      backgroundColor: inscriptionStatus === 'APPROVED' ? '#0076A8' :
                                       inscriptionStatus === 'PENDING' ? '#3399CC' :
                                       '#F28C00',
                      borderColor: inscriptionStatus === 'APPROVED' ? '#0076A8' :
                                   inscriptionStatus === 'PENDING' ? '#3399CC' :
                                   '#F28C00',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => handleInscribe()}
                    disabled={
                      !isAvailable ||
                      isFull ||
                      !areInscriptionsOpen ||
                      isSubscribing ||
                      inscriptionStatus === 'PENDING' ||
                      inscriptionStatus === 'APPROVED'
                    }
                    title={
                      inscriptionStatus === 'PENDING'
                        ? 'Inscripción pendiente de aprobación'
                        : inscriptionStatus === 'APPROVED'
                        ? 'Ya estás inscrito en este taller'
                        : !isAvailable && resource.inscriptionsStartDate
                        ? `Disponible a partir del ${new Date(
                            resource.inscriptionsStartDate
                          ).toLocaleDateString()}`
                        : isFull
                        ? 'Taller lleno'
                        : !areInscriptionsOpen
                        ? 'Inscripciones cerradas'
                        : 'Inscribirme al taller'
                    }
                  >
                    {inscriptionStatus === 'PENDING'
                      ? 'Pendiente'
                      : inscriptionStatus === 'APPROVED'
                      ? 'Inscrito'
                      : isSubscribing
                      ? 'Inscribiendo...'
                      : !isAvailable
                      ? 'Próximamente'
                      : isFull
                      ? 'Taller Lleno'
                      : !areInscriptionsOpen
                      ? 'Cerrado'
                      : 'Inscribirme'}
                  </button>
                ) : (
                  <button
                    className="btn btn-warning text-white"
                    style={{ backgroundColor: '#F28C00', borderColor: '#F28C00' }}
                    onClick={() => addToCart({ ...resource, type })}
                  >
                    Agregar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceCard;