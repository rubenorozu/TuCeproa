'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, startOfDay, endOfDay, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Reservation, ReservationStatus } from '@prisma/client';


// --- Modal Styles --- //
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalContentStyle: React.CSSProperties = {
  background: 'white', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '500px',
};
const modalHeaderStyle: React.CSSProperties = {
  fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem',
};
const modalBodyStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const modalFooterStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: '10px' };
const buttonStyle: React.CSSProperties = {
  padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: 'white',
};

// --- Component --- //

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { locale: es }), getDay, locales });

interface AdminCalendarProps {
  spaceId?: string;
  equipmentId?: string;
}

interface CalendarEvent extends BigCalendarEvent {
  id: string;
  status?: ReservationStatus;
  isBlock: boolean;
}

export default function AdminCalendar({ spaceId, equipmentId }: AdminCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onNavigate = useCallback((newDate: Date) => setDate(newDate), [setDate]);
  const onView = useCallback((newView: string) => setView(newView), [setView]);

  const fetchEvents = useCallback(async () => {
    if (!spaceId && !equipmentId) return;

    let apiQuery = '';
    if (spaceId) {
      apiQuery = `spaceId=${spaceId}`;
    } else if (equipmentId) {
      apiQuery = `equipmentId=${equipmentId}`;
    }

    let viewStart, viewEnd;

    if (view === 'month') {
      viewStart = startOfMonth(date);
      viewEnd = endOfMonth(date);
    } else if (view === 'day') {
      viewStart = startOfDay(date);
      viewEnd = endOfDay(date);
    } else { // Default to week
      viewStart = startOfWeek(date, { locale: es });
      viewEnd = endOfWeek(date, { locale: es });
    }

    const response = await fetch(`/api/reservations?${apiQuery}&start=${viewStart.toISOString()}&end=${viewEnd.toISOString()}`);
    if (response.ok) {
      const reservations: (Reservation & { user: { firstName: string, lastName: string } })[] = await response.json();
      const formattedEvents: CalendarEvent[] = reservations
        .filter(res => res.status !== 'REJECTED')
        .map((res) => ({
          id: res.id,
          title: `${res.justification} (${res.user.firstName} ${res.user.lastName})`,
          start: new Date(res.startTime),
          end: new Date(res.endTime),
          resourceId: res.id,
          status: res.status,
          isBlock: res.subject === 'Bloqueo Administrativo',
        }));
      setEvents(formattedEvents);
    }
  }, [spaceId, equipmentId, date, view]); // Added view to dependency array

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSelectSlot = useCallback(
    async ({ start, end }: { start: Date, end: Date }) => {
      const title = window.prompt('Motivo del bloqueo:');
      if (title) {
        setIsLoading(true);
        const body: any = { start, end, title };
        if (spaceId) body.spaceId = spaceId;
        else if (equipmentId) body.equipmentId = equipmentId;

        const response = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        setIsLoading(false);
        if (response.ok) {
          alert('¡Horario bloqueado exitosamente!');
          fetchEvents();
        } else {
          alert('Error al crear el bloqueo.');
        }
      }
    },
    [spaceId, equipmentId, fetchEvents]
  );

  const handleEventAction = async (action: 'APPROVE' | 'REJECT' | 'DELETE') => {
    if (!selectedEvent) return;
    setIsLoading(true);

    let response;
    const eventId = selectedEvent.id;

    if (action === 'DELETE') {
      if (!window.confirm('¿Estás seguro de que quieres eliminar esta reserva?')) {
        setIsLoading(false);
        return;
      }
      response = await fetch(`/api/reservations/${eventId}`, { method: 'DELETE' });
    } else {
      const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      response = await fetch(`/api/reservations/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    }

    setIsLoading(false);
    if (response.ok) {
      alert(`¡Acción completada con éxito!`);
      setSelectedEvent(null);
      fetchEvents();
    } else {
      alert('Ocurrió un error al procesar la solicitud.');
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad'; // Blue for approved
    if (event.isBlock) {
      backgroundColor = '#d9534f'; // Red for blocks
    } else if (event.status === 'PENDING') {
      backgroundColor = '#f0ad4e'; // Orange for pending
    }
    return { style: { backgroundColor, opacity: isLoading ? 0.5 : 1 } };
  };

  const { messages } = useMemo(() => ({
    messages: {
      next: "Siguiente", previous: "Anterior", today: "Hoy", month: "Mes", week: "Semana", day: "Día", agenda: "Agenda", date: "Fecha", time: "Hora", event: "Evento", noEventsInRange: "No hay eventos en este rango.", showMore: (total: number) => `+ Ver más (${total})`
    }
  }), []);

  return (
    <>
      {selectedEvent && (
        <div style={modalOverlayStyle} onClick={() => setSelectedEvent(null)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>{selectedEvent.title}</div>
            <div style={modalBodyStyle}>
              <p><strong>Inicio:</strong> {format(selectedEvent.start!, 'Pp', { locale: es })}</p>
              <p><strong>Fin:</strong> {format(selectedEvent.end!, 'Pp', { locale: es })}</p>
              <p><strong>Estado:</strong> {selectedEvent.status}</p>
            </div>
            <div style={modalFooterStyle}>
              {selectedEvent.status === 'PENDING' && (
                <>
                  <button style={{...buttonStyle, backgroundColor: '#5cb85c'}} onClick={() => handleEventAction('APPROVE')}>Aprobar</button>
                  <button style={{...buttonStyle, backgroundColor: '#f0ad4e'}} onClick={() => handleEventAction('REJECT')}>Rechazar</button>
                </>
              )}
              <button style={{...buttonStyle, backgroundColor: '#d9534f'}} onClick={() => handleEventAction('DELETE')}>Eliminar</button>
              <button style={{...buttonStyle, backgroundColor: '#6c757d'}} onClick={() => setSelectedEvent(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%', opacity: isLoading ? 0.5 : 1 }}
        culture="es"
        messages={messages}
        selectable
        onSelectEvent={(event) => setSelectedEvent(event as CalendarEvent)}
        onSelectSlot={handleSelectSlot}
        onNavigate={onNavigate}
        onView={onView}
        view={view as any}
        date={date}
        eventPropGetter={eventStyleGetter}
        min={new Date(0, 0, 0, 7, 0, 0)}
        max={new Date(0, 0, 0, 22, 0, 0)}
      />
    </>
  );
}
