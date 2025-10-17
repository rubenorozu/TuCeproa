'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';

interface WorkshopSession {
  id?: string;
  dayOfWeek: number;
  timeStart: string;
  timeEnd: string;
  room?: string | null;
}

interface Workshop {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  images: { url: string }[]; // Añadido para manejar múltiples imágenes
  responsibleUserId: string | null;
  availableFrom: string | null;
  teacher: string | null; // Añadido
  startDate: string | null; // Añadido
  endDate: string | null; // Añadido
  inscriptionsStartDate: string | null; // NUEVO: Fecha de apertura de inscripciones
  sessions: WorkshopSession[]; // Añadido
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function EditWorkshopPage() {
  const { user: sessionUser, loading: sessionLoading } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teacher, setTeacher] = useState(''); // Añadido
  const [availableFrom, setAvailableFrom] = useState('');
  const [startDate, setStartDate] = useState(''); // Añadido
  const [endDate, setEndDate] = useState(''); // Añadido
  const [inscriptionsStartDate, setInscriptionsStartDate] = useState(''); // NUEVO: Fecha de apertura de inscripciones
  const [workshopSessions, setWorkshopSessions] = useState<WorkshopSession[]>([]); // Añadido
  const [currentImageUrls, setCurrentImageUrls] = useState<string[]>([]); // Para URLs de imágenes existentes
  const [users, setUsers] = useState<User[]>([]);
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null); // Para una nueva imagen
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const handleAddSession = () => {
    setWorkshopSessions([...workshopSessions, { dayOfWeek: 1, timeStart: '', timeEnd: '', room: '' }]);
  };

  const handleRemoveSession = (index: number) => {
    const newSessions = workshopSessions.filter((_, i) => i !== index);
    setWorkshopSessions(newSessions);
  };

  const handleSessionChange = (index: number, field: string, value: string | number) => {
    const newSessions = [...workshopSessions];
    newSessions[index] = { ...newSessions[index], [field]: value };
    setWorkshopSessions(newSessions);
  };

  useEffect(() => {
    if (sessionLoading) return; // Wait for session to load

    if (!sessionUser || sessionUser.role !== 'SUPERUSER') {
      router.push('/'); // Redirect if not superuser
      return;
    }

    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token'); // Fallback, sessionUser should have token if logged in
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

    const fetchWorkshop = async () => {
      try {
        const token = localStorage.getItem('token'); // Fallback
        const res = await fetch(`/api/workshops/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Error al cargar el taller.');
        }

        const data: Workshop = await res.json();
        setName(data.name);
        setDescription(data.description || '');
        setTeacher(data.teacher || '');
        setResponsibleUserId(data.responsibleUserId || '');
        setAvailableFrom(data.availableFrom ? new Date(data.availableFrom).toISOString().split('T')[0] : '');
        setStartDate(data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '');
        setEndDate(data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '');
        setInscriptionsStartDate(data.inscriptionsStartDate ? new Date(data.inscriptionsStartDate).toISOString().split('T')[0] : '');
        setWorkshopSessions(data.sessions || []);
        setCurrentImageUrls(data.images?.map(img => img.url) || []);

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
      fetchWorkshop();
    }
  }, [id, router, sessionLoading, sessionUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name) {
      setError('El nombre del taller es obligatorio.');
      return;
    }

    const token = localStorage.getItem('token');
    console.log('Frontend Token:', token); // Added for debugging
    const formData = new FormData(); // Restaurado
    formData.append('name', name);
    formData.append('description', description);
    formData.append('teacher', teacher);
    formData.append('availableFrom', availableFrom ? new Date(availableFrom).toISOString() : '');
    formData.append('startDate', startDate ? new Date(startDate).toISOString() : '');
    formData.append('endDate', endDate ? new Date(endDate).toISOString() : '');
    formData.append('inscriptionsStartDate', inscriptionsStartDate ? new Date(inscriptionsStartDate).toISOString() : '');
    formData.append('responsibleUserId', responsibleUserId);

    // Añadir sesiones serializadas
    const sessionsJson = JSON.stringify(workshopSessions);
    formData.append('sessions', sessionsJson);

    // Añadir URLs de imágenes existentes
    currentImageUrls.forEach(url => {
      formData.append('existingImages[]', url);
    });

    // Añadir nuevas imágenes (si hay)
    if (imageFile) {
      formData.append('newImages', imageFile);
    }

    // --- INICIO DE DEPURACIÓN ---
    console.log('Valor de workshopSessions antes de enviar:', workshopSessions); // NUEVO: Log de workshopSessions
    console.log('Valor de sessionsJson enviado en FormData:', sessionsJson); // NUEVO: Log del JSON de sesiones
    console.log('Valor de existingImagesJson enviado en FormData:', existingImagesJson); // NUEVO: Log del JSON de imágenes existentes

    console.log('Inspeccionando FormData:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    // --- FIN DE DEPURACIÓN ---

    try {
      const res = await fetch(`/api/admin/workshops/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al actualizar el taller.');
      }

      setSuccess('Taller actualizado con éxito!');
      router.push('/admin/workshops'); // Redirect to workshops list
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred');
        }
    }
  };

  if (loading) {
    return <div className="container mt-5">Cargando taller...</div>;
  }

  if (error && !name) { // Only show error if workshop data could not be loaded
    return <div className="container mt-5 alert alert-danger">Error: {error}</div>;
  }

  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <h2 style={{ color: '#0076A8' }}>Editar Taller</h2>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="name" className="form-label">Nombre del Taller</label>
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
          <label htmlFor="teacher" className="form-label">Profesor</label>
          <input
            type="text"
            className="form-control"
            id="teacher"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
          />
        </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label htmlFor="availableFrom" className="form-label">Fecha de Apertura</label>
            <input
              type="date"
              className="form-control"
              id="availableFrom"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
            />
          </div>
          <div className="col-md-6 mb-3">
            <label htmlFor="startDate" className="form-label">Fecha de Inicio del Taller</label>
            <input
              type="date"
              className="form-control"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="col-md-6 mb-3">
            <label htmlFor="endDate" className="form-label">Fecha de Fin del Taller</label>
            <input
              type="date"
              className="form-control"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="col-md-6 mb-3">
            <label htmlFor="inscriptionsStartDate" className="form-label">Fecha de Apertura de Inscripciones</label>
            <input
              type="date"
              className="form-control"
              id="inscriptionsStartDate"
              value={inscriptionsStartDate}
              onChange={(e) => setInscriptionsStartDate(e.target.value)}
            />
          </div>
        </div>
        {/* Sección para añadir sesiones */}
        <div className="mb-3">
          <label className="form-label">Sesiones Recurrentes</label>
          {workshopSessions.map((session, index) => (
            <div key={index} className="row mb-2 align-items-end">
              <div className="col-md-3">
                <label htmlFor={`dayOfWeek-${index}`} className="form-label visually-hidden">Día de la Semana</label>
                <select
                  className="form-select"
                  id={`dayOfWeek-${index}`}
                  value={session.dayOfWeek}
                  onChange={(e) => handleSessionChange(index, 'dayOfWeek', parseInt(e.target.value))}
                  required
                >
                  <option value="">Selecciona un día</option>
                  <option value={1}>Lunes</option>
                  <option value={2}>Martes</option>
                  <option value={3}>Miércoles</option>
                  <option value={4}>Jueves</option>
                  <option value={5}>Viernes</option>
                  <option value={6}>Sábado</option>
                  <option value={0}>Domingo</option>
                </select>
              </div>
              <div className="col-md-3">
                <label htmlFor={`timeStart-${index}`} className="form-label visually-hidden">Hora de Inicio</label>
                <input
                  type="time"
                  className="form-control"
                  id={`timeStart-${index}`}
                  value={session.timeStart}
                  onChange={(e) => handleSessionChange(index, 'timeStart', e.target.value)}
                  required
                />
              </div>
              <div className="col-md-3">
                <label htmlFor={`timeEnd-${index}`} className="form-label visually-hidden">Hora de Fin</label>
                <input
                  type="time"
                  className="form-control"
                  id={`timeEnd-${index}`}
                  value={session.timeEnd}
                  onChange={(e) => handleSessionChange(index, 'timeEnd', e.target.value)}
                  required
                />
              </div>
              <div className="col-md-2">
                <label htmlFor={`room-${index}`} className="form-label visually-hidden">Aula</label>
                <input
                  type="text"
                  className="form-control"
                  id={`room-${index}`}
                  value={session.room || ''}
                  placeholder="Aula (opcional)"
                  onChange={(e) => handleSessionChange(index, 'room', e.target.value)}
                />
              </div>
              <div className="col-md-1">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleRemoveSession(index)}
                  disabled={workshopSessions.length === 1}
                >
                  -
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-success" onClick={handleAddSession}>
            + Añadir Sesión
          </button>
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
              <option key={user.id} value={user.id}>{user.firstName} {user.lastName} ({user.email})</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label htmlFor="imageFile" className="form-label">Imagen del Taller (opcional)</label>
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
          Actualizar Taller
        </button>
        <Link href="/admin/workshops" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}
