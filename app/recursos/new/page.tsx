'use client';

import { Suspense } from 'react';
import ReservationForm from '@/components/ReservationForm';

export const dynamic = 'force-dynamic';

export default function NewReservationPage() {
  return (
    <Suspense fallback={<div>Cargando formulario de reserva...</div>}>
      <ReservationForm />
    </Suspense>
  );
}