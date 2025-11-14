'use client';

import React, { useState, useEffect } from 'react';
import TabbedCalendarView from '@/components/reservations/TabbedCalendarView';
import { Spinner, Alert } from 'react-bootstrap';
import { Space, Equipment } from '@prisma/client';

export default function CalendarsPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);
        // Intenta obtener todos los recursos con la ruta privilegiada
        const response = await fetch('/api/admin/all-resources');
        if (!response.ok) {
          // Si falla, lanza un error para activar el mecanismo de respaldo
          console.warn(`Privileged fetch failed with status ${response.status}. Attempting fallback.`);
          throw new Error('Privileged fetch failed');
        }
        const data = await response.json();
        setSpaces(data.spaces);
        setEquipment(data.equipment);
      } catch (err) {
        // Si el intento principal falla, usa la ruta de respaldo que respeta RLS
        console.log('Fallback: Fetching resources with standard permissions.');
        try {
          const fallbackResponse = await fetch('/api/admin/my-resources');
          if (!fallbackResponse.ok) {
            const errorData = await fallbackResponse.json();
            throw new Error(errorData.error || 'La carga de recursos también falló en el modo de respaldo.');
          }
          const fallbackData = await fallbackResponse.json();
          setSpaces(fallbackData.spaces);
          setEquipment(fallbackData.equipment);
        } catch (fallbackErr: any) {
          setError(fallbackErr.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando calendarios...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger" className="mt-4">Error: {error}</Alert>;
  }

  return <TabbedCalendarView spaces={spaces} equipment={equipment} />;
}