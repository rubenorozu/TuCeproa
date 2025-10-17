'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';

export default function NewWorkshopPage() {
  const { user: sessionUser, loading: sessionLoading } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teacher, setTeacher] = useState(''); // NUEVO: Estado para el profesor
  const [availableFrom, setAvailableFrom] = useState(''); // RESTAURADO: Fecha de apertura de inscripciones
  const [startDate, setStartDate] = useState(''); // NUEVO: Fecha de inicio del taller
  const [endDate, setEndDate] = useState(''); // NUEVO: Fecha de fin del taller
  const [inscriptionsStartDate, setInscriptionsStartDate] = useState(''); // NUEVO: Fecha de apertura de inscripciones
  const [workshopSessions, setWorkshopSessions] = useState([{ dayOfWeek: 1, timeStart: '09:00', timeEnd: '10:00', room: '' }]); // Nuevo estado para sesiones con campos de recurrencia
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string; email: string; role: string }[]>([]);
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleAddSession = () => {
    setWorkshopSessions([...workshopSessions, { dayOfWeek: 1, timeStart: '', timeEnd: '', room: '' }]); // Corregido: Añadir dayOfWeek
  };

  const handleRemoveSession = (index: number) => {
    const newSessions = workshopSessions.filter((_, i) => i !== index);
    setWorkshopSessions(newSessions);
  };

  const handleSessionChange = (index: number, field: string, value: string) => {
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
    fetchUsers();
  }, [router, sessionLoading, sessionUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name) {
      setError('El nombre del taller es obligatorio.');
      return;
    }

    if (workshopSessions.length === 0) {
      setError('Debe añadir al menos una sesión para el taller.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('No autenticado. Por favor, inicie sesión.');
      router.push('/login');
      return;
    }

    let imageUrls: { url: string }[] = [];
    if (imageFile) {
      // Subir la imagen primero
      const imageFormData = new FormData();
      imageFormData.append('file', imageFile); // La API de upload espera 'file'

      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: imageFormData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.message || 'Error al subir la imagen.');
        }
        const uploadData = await uploadRes.json();
        imageUrls.push({ url: uploadData.url }); // Asumiendo que la API de upload devuelve { url: '...' }
      } catch (uploadError: unknown) {
        if (uploadError instanceof Error) {
          setError(`Error al subir la imagen: ${uploadError.message}`);
        } else {
          setError('Ocurrió un error desconocido al subir la imagen.');
        }
        return; // Detener el proceso si la subida de imagen falla
      }
    }

    try {
      const res = await fetch('/api/admin/workshops', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json', // Ahora enviamos JSON
        },
        body: JSON.stringify({
          name,
          description,
          availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null, // RESTAURADO: Enviar availableFrom
          startDate: startDate ? new Date(startDate).toISOString() : null, // NUEVO: Enviar startDate
          endDate: endDate ? new Date(endDate).toISOString() : null, // NUEVO: Enviar endDate
          inscriptionsStartDate: inscriptionsStartDate ? new Date(inscriptionsStartDate).toISOString() : null, // NUEVO: Enviar inscriptionsStartDate
          teacher,
          responsibleUserId,
          images: imageUrls, // Enviar las URLs de las imágenes
          sessions: workshopSessions.map(session => ({
            dayOfWeek: session.dayOfWeek,
            timeStart: session.timeStart,
            timeEnd: session.timeEnd,
            room: session.room,
          })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al crear el taller.');
      }

      setSuccess('Taller creado con éxito!');
      // Reset form fields
      setName('');
      setDescription('');
      setAvailableFrom('');
      setEndDate(''); // NUEVO: Resetear endDate
      setInscriptionsStartDate(''); // NUEVO: Resetear inscriptionsStartDate
      setWorkshopSessions([{ dayOfWeek: 1, timeStart: '', timeEnd: '', room: '' }]); // Resetear sesiones con dayOfWeek
      setResponsibleUserId('');
      setImageFile(null);
      router.push('/admin/workshops'); // Redirect to workshops list
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred');
        }
    }
  };

  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <h2 style={{ color: '#0076A8' }}>Crear Nuevo Taller</h2>
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
            <label htmlFor="availableFrom" className="form-label">Inscripciones Abiertas Desde</label>
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
                  value={session.room}
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
        </div>
        <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>
          Crear Taller
        </button>
        <Link href="/admin/workshops" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}