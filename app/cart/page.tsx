'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { Spinner, Alert, Container, Form, Row, Col } from 'react-bootstrap';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';

registerLocale('es', es);

export default function CartPage() {
  const { cart, removeFromCart, clearCart } = useCart();
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  // Form state
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [justification, setJustification] = useState('');
  const [subject, setSubject] = useState('');
  const [coordinator, setCoordinator] = useState('');
  const [teacher, setTeacher] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reservationLeadTime, setReservationLeadTime] = useState<number>(24); // Default to 24 hours
  const [recurringBlocks, setRecurringBlocks] = useState<any[]>([]);

  useEffect(() => {
    const fetchRecurringBlocks = async () => {
      try {
        const response = await fetch('/api/admin/recurring-blocks');
        if (response.ok) {
          const data = await response.json();
          setRecurringBlocks(data);
        }
      } catch (error) {
        console.error('Error al cargar los bloqueos recurrentes:', error);
      }
    };

    fetchRecurringBlocks();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.reservationLeadTime) {
            setReservationLeadTime(parseInt(data.reservationLeadTime, 10));
          }
        }
      } catch (error) {
        console.error('Error al cargar la configuración:', error);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push('/login');
    }
  }, [user, sessionLoading, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!startTime || !endTime || !justification || !subject || !coordinator || !teacher) {
      setError('Todos los campos del formulario son obligatorios.');
      return;
    }

    const now = new Date();

    for (const item of cart) {
      const itemLeadTime = item.reservationLeadTime !== undefined && item.reservationLeadTime !== null
        ? item.reservationLeadTime
        : reservationLeadTime; // Fallback to global if item-specific is not set

      const leadTimeInMs = itemLeadTime * 60 * 60 * 1000;
      const minimumStartTime = new Date(now.getTime() + leadTimeInMs);

      if (startTime < minimumStartTime) {
        setError(`La reserva para "${item.name}" debe hacerse con al menos ${itemLeadTime} horas de antelación.`);
        return;
      }
    }

    // Check for conflicts with recurring blocks
    const requestedDay = startTime.getDay();
    const requestedStartTime = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
    const requestedEndTime = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

    for (const block of recurringBlocks) {
      const item = cart.find(item => item.id === block.spaceId || item.id === block.equipmentId);
      if (item) {
        if (requestedDay === block.dayOfWeek) {
          if (startTime >= new Date(block.startDate) && startTime <= new Date(block.endDate)) {
            if (requestedStartTime < block.endTime && requestedEndTime > block.startTime) {
              setError(`El recurso no está disponible en este horario debido a un bloqueo recurrente: ${block.title}`);
              return;
            }
          }
        }
      }
    }

    if (!user) {
      setError('Debes iniciar sesión para hacer una reserva.');
      return;
    }
    
    const payload = {
      items: cart.map(item => ({ id: item.id, type: item.type })),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      justification,
      subject,
      coordinator,
      teacher,
    };

    try {
      const res = await fetch('/api/user-reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al enviar la solicitud de reserva.');
      }

      setSuccess('¡Solicitud de reserva enviada con éxito para todos los artículos!');
      clearCart();

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      return;
    }
  };

  if (sessionLoading) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando sesión...</p></Container>;
  }

  if (!user) {
    return <Container className="mt-5"><Alert variant="warning">Debes iniciar sesión para ver tu carrito.</Alert></Container>;
  }

  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ color: '#0076A8' }}>Carrito de Reservas</h2>
        {cart.length > 0 && (
          <button className="btn btn-outline-danger" onClick={clearCart}>Vaciar Carrito</button>
        )}
      </div>
      <hr />
      {success && (
        <div className="alert alert-success">
          <h4>¡Éxito!</h4>
          <p>{success}</p>
          <Link href="/reservations" className="btn btn-primary mt-3" style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>
            Ver mis reservas
          </Link>
        </div>
      )}
      {cart.length === 0 ? (
        <div className="text-center">
          <p>Tu carrito está vacío.</p>
          <Link href="/recursos" className="btn btn-primary" style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>Ver Recursos</Link>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-5">
            <h4>Artículos en la Reserva</h4>
            <ul className="list-group mb-4">
              {cart.map(item => (
                <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">{item.name}</h5>
                    <small className="text-muted">Tipo: {item.type === 'space' ? 'Espacio' : 'Equipo'}</small>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => removeFromCart(item.id)}>Eliminar</button>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-7">
            <h4>Detalles de la Solicitud</h4>
            <div className="card">
              <div className="card-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <Form onSubmit={handleSubmit}>
                  <Row className="mb-3">
                    <Form.Group as={Col} md="6" controlId="startTime" className="date-picker-wrapper">
                      <Form.Label>Inicio</Form.Label>
                      <DatePicker
                        selected={startTime}
                        onChange={(date: Date | null) => setStartTime(date)}
                        showTimeSelect
                        dateFormat="Pp"
                        className="form-control"
                        locale="es"
                      />
                    </Form.Group>
                    <Form.Group as={Col} md="6" controlId="endTime" className="date-picker-wrapper">
                      <Form.Label>Fin</Form.Label>
                      <DatePicker
                        selected={endTime}
                        onChange={(date: Date | null) => setEndTime(date)}
                        showTimeSelect
                        dateFormat="Pp"
                        className="form-control"
                        locale="es"
                      />
                    </Form.Group>
                  </Row>
                  <Form.Group className="mb-3" controlId="subject">
                    <Form.Label>Materia</Form.Label>
                    <Form.Control type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="teacher">
                    <Form.Label>Maestro que solicita</Form.Label>
                    <Form.Control type="text" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="coordinator">
                    <Form.Label>Coordinador que autoriza</Form.Label>
                    <Form.Control type="text" value={coordinator} onChange={(e) => setCoordinator(e.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="justification">
                    <Form.Label>Justificación del Proyecto</Form.Label>
                    <Form.Control as="textarea" rows={4} value={justification} onChange={(e) => setJustification(e.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="file">
                    <Form.Label>Adjuntar Guión o Formato</Form.Label>
                    <Form.Control type="file" onChange={handleFileChange} multiple />
                  </Form.Group>
                  <button type="submit" className="btn btn-primary w-100" style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>
                    Enviar Solicitud de Reserva
                  </button>
                </Form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
