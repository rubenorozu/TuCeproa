'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Space {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  responsibleUserId: string | null;
}

export default function EditSpacePage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user || JSON.parse(user).role !== 'SUPERUSER') {
      router.push('/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
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

    const fetchSpace = async () => {
      try {
        const res = await fetch(`/api/admin/spaces/${id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Error al cargar el espacio.');
        }

        const data: Space = await res.json();
        setName(data.name);
        setDescription(data.description || '');
        setImageUrl(data.imageUrl || '');
        setResponsibleUserId(data.responsibleUserId || '');
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

    if (id) {
      fetchUsers();
      fetchSpace();
    }
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name) {
      setError('El nombre del espacio es obligatorio.');
      return;
    }

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('responsibleUserId', responsibleUserId);
    if (imageFile) {
      formData.append('imageFile', imageFile);
    }

    try {
      const res = await fetch(`/api/admin/spaces/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al actualizar el espacio.');
      }

      setSuccess('Espacio actualizado con éxito!');
      router.push('/admin/spaces'); // Redirect to spaces list
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred');
        }
    }
  };

  if (loading) {
    return <div className="container mt-5">Cargando espacio...</div>;
  }

  if (error && !name) { // Only show error if space data could not be loaded
    return <div className="container mt-5 alert alert-danger">Error: {error}</div>;
  }

  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <h2 style={{ color: '#0076A8' }}>Editar Espacio</h2>
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
          {imageUrl && <small className="text-muted">Imagen actual: <a href={imageUrl} target="_blank" rel="noopener noreferrer">Ver</a></small>}
        </div>
        <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>
          Actualizar Espacio
        </button>
        <Link href="/admin/spaces" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}