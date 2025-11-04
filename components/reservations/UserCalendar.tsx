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

interface CalendarEvent extends BigCalendarEvent {
  id: string;
  status?: ReservationStatus;
  fullReservation: any;
}

export default function UserCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onNavigate = useCallback((newDate: Date) => setDate(newDate), [setDate]);
  const onView = useCallback((newView: string) => setView(newView), [setView]);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    let viewStart, viewEnd;
    if (view === 'month') {
      viewStart = startOfMonth(date);
      viewEnd = endOfMonth(date);
    } else if (view === 'day') {
      viewStart = startOfDay(date);
      viewEnd = endOfDay(date);
    } else {
      viewStart = startOfWeek(date, { locale: es });
      viewEnd = endOfWeek(date, { locale: es });
    }

    try {
      const response = await fetch(`/api/user-reservations?start=${viewStart.toISOString()}&end=${viewEnd.toISOString()}`);
      if (response.ok) {
        const reservations = await response.json();
        const formattedEvents: CalendarEvent[] = reservations
          .filter((res: any) => res.status !== 'REJECTED')
          .map((res: any) => ({
            id: res.id,
            title: res.justification,
            start: new Date(res.startTime),
            end: new Date(res.endTime),
            status: res.status,
            fullReservation: res,
          }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error("Failed to fetch reservations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [date, view]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad'; // Blue for approved
    if (event.status === 'PENDING') {
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
              <p><strong>Recurso:</strong> {selectedEvent.fullReservation.space?.name || selectedEvent.fullReservation.equipment?.name}</p>
              <p><strong>Inicio:</strong> {format(selectedEvent.start!, 'Pp', { locale: es })}</p>
              <p><strong>Fin:</strong> {format(selectedEvent.end!, 'Pp', { locale: es })}</p>
              <p><strong>Estado:</strong> {selectedEvent.status}</p>
              <p><strong>Justificación:</strong> {selectedEvent.fullReservation.justification}</p>
            </div>
            <div style={modalFooterStyle}>
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
        style={{ height: '70vh', opacity: isLoading ? 0.5 : 1 }}
        culture="es"
        messages={messages}
        onSelectEvent={(event) => setSelectedEvent(event as CalendarEvent)}
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
