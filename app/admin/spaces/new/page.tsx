'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';

export default function NewSpacePage() {
  const { user: sessionUser, loading: sessionLoading } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (sessionLoading) return;

    if (!sessionUser || (sessionUser.role !== 'SUPERUSER' && sessionUser.role !== 'ADMIN_RESOURCE')) {
      router.push('/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data.filter((u: { role: string }) => u.role === 'SUPERUSER' || u.role === 'ADMIN_RESOURCE'));
        } else {
          console.error('Failed to fetch users');
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, [router, sessionLoading, sessionUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name) {
      setError('El nombre del espacio es obligatorio.');
      return;
    }

    let imageUrls: string[] = [];

    if (imageFile) {
      try {
        const imageFormData = new FormData();
        imageFormData.append('files', imageFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData,
        });

        if (!uploadRes.ok) {
          throw new Error('Error al subir la imagen.');
        }

        const uploadData = await uploadRes.json();
        imageUrls = uploadData.urls;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido al subir la imagen.');
        return;
      }
    }

    try {
      const spaceData = {
        name,
        description,
        responsibleUserId,
        images: imageUrls.map(url => ({ url })), // Estructura para Prisma
      };

      const res = await fetch('/api/admin/spaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(spaceData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al crear el espacio.');
      }

      setSuccess('Espacio creado con éxito!');
      setName('');
      setDescription('');
      setResponsibleUserId('');
      setImageFile(null);
      router.push('/admin/spaces');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al crear el espacio.');
    }
  };

  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <h2 style={{ color: '#0076A8' }}>Crear Nuevo Espacio</h2>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="name" className="form-label">Nombre del Espacio</label>
          <input
            type="text"
            className="form-control"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="description" className="form-label">Descripción</label>
          <textarea
            className="form-control"
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>
        <div className="mb-3">
          <label htmlFor="responsibleUser" className="form-label">Encargado</label>
          <select
            className="form-select"
            id="responsibleUser"
            value={responsibleUserId}
            onChange={(e) => setResponsibleUserId(e.target.value)}
          >
            <option value="">Selecciona un encargado</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label htmlFor="imageFile" className="form-label">Imagen del Espacio (opcional)</label>
          <input
            type="file"
            className="form-control"
            id="imageFile"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>
          Crear Espacio
        </button>
        <Link href="/admin/spaces" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}
