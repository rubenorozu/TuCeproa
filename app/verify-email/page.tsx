'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState('Verificando tu correo...');

  useEffect(() => {
    if (token) {
      const verifyEmail = async () => {
        try {
          const res = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          const data = await res.json();
          setMessage(data.message || 'Error al verificar el correo.');
        } catch (error) {
          setMessage('Error al conectar con el servidor.');
        }
      };
      verifyEmail();
    } else {
      setMessage('No se ha proporcionado un token de verificación.');
    }
  }, [token]);

  return (
    <div className="container mt-5 pt-5 text-center">
      <div className="card col-md-6 mx-auto shadow-sm">
        <div className="card-body p-5">
          <h2>Verificación de Correo</h2>
          <p className="mt-4 fs-5">{message}</p>
          <Link href="/login" className="btn btn-primary" style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>Ir al Login</Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
