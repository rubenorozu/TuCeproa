'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ResourceDetailPage() {
  const params = useParams();
  const { id } = params;

  return (
    <div className="container mt-5 pt-5">
      <h1>Página de Detalles del Recurso</h1>
      <p>Detalles para el recurso con ID: {id}</p>
      <Link href="/">Volver al Inicio</Link>
    </div>
  );
}
