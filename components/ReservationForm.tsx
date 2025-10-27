'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function ReservationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [justification, setJustification] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [equipmentId, setEquipmentId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }

    setSpaceId(searchParams.get('spaceId'));
    setEquipmentId(searchParams.get('equipmentId'));

  }, [router, searchParams]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!startTime || !endTime || !justification) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    const formData = new FormData();
    if (spaceId) formData.append('spaceId', spaceId);
    if (equipmentId) formData.append('equipmentId', equipmentId);
    formData.append('startTime', startTime);
    formData.append('endTime', endTime);
    formData.append('justification', justification);
    if (file) {
      formData.append('file_0', file);
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        setSuccess('Solicitud de reserva enviada con éxito.');
        setTimeout(() => {
          router.push('/recursos');
        }, 2000);
      } else {
        try {
          const data = await res.json();
          setError(data.message || 'Algo salió mal.');
        } catch (jsonError) {
          setError(res.statusText || 'Algo salió mal al procesar la respuesta del servidor.');
        }
      }
    } catch (error) {
      setError('Algo salió mal.');
    }
  };

  return (
    <div>
      <Navbar />
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-body">
                <h2 className="card-title text-center">Solicitar Reserva</h2>
                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="startTime" className="form-label">Inicio de la reserva</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      id="startTime"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="endTime" className="form-label">Fin de la reserva</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      id="endTime"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="justification" className="form-label">Justificación</label>
                    <textarea
                      className="form-control"
                      id="justification"
                      rows={5}
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="file" className="form-label">Adjuntar Archivos (Opcional)</label>
                    <input
                      type="file"
                      className="form-control"
                      id="file"
                      onChange={handleFileChange}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100">
                    Enviar Solicitud
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
