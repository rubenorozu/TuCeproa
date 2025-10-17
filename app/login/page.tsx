'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext'; // Importamos useSession

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { user, loading, login } = useSession(); // Usamos el hook useSession

  // Redirigir si el usuario ya está logueado
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        // Actualizamos el contexto de sesión en el frontend
        await login(data.user); // login ahora es asíncrono
        router.push('/');
      } else {
        const data = await res.json();
        setError(data.message || 'Credenciales inválidas.');
      }
    } catch (error) {
      setError('Algo salió mal al intentar iniciar sesión.');
    }
  };

  // Si está cargando o el usuario ya está logueado, no mostramos el formulario
  if (loading || user) {
    return null; // O un spinner de carga
  }

  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h2 className="card-title text-center mb-4" style={{ color: '#0076A8' }}>Iniciar Sesión</h2>
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Contraseña</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100" style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>
                  Iniciar Sesión
                </button>
              </form>
              <div className="mt-3 text-center">
                <span>¿No tienes una cuenta? </span>
                <Link href="/register" style={{ color: '#F28C00' }}>Regístrate</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}