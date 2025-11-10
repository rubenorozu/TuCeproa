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
  isBlock?: boolean;
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
      const [reservationsRes, recurringBlocksRes] = await Promise.all([
        fetch(`/api/user-reservations?start=${viewStart.toISOString()}&end=${viewEnd.toISOString()}`),
        fetch(`/api/admin/recurring-blocks`)
      ]);

      let allEvents: CalendarEvent[] = [];

      if (reservationsRes.ok) {
        const reservations = await reservationsRes.json();
        const formattedReservations: CalendarEvent[] = reservations
          .map((res: any) => ({
            id: res.id,
            title: res.justification,
            start: new Date(res.startTime),
            end: new Date(res.endTime),
            status: res.status,
            isBlock: false,
            fullReservation: res,
          }));
        allEvents = allEvents.concat(formattedReservations);
      }

      if (recurringBlocksRes.ok) {
        const recurringBlocks = await recurringBlocksRes.json();
        const recurringEvents = recurringBlocks.flatMap((block: any) => {
          const events: CalendarEvent[] = [];
          let current = new Date(viewStart);

          while (current <= viewEnd) {
            if (current.getDay() === block.dayOfWeek) {
              const [startHour, startMinute] = block.startTime.split(':');
              const [endHour, endMinute] = block.endTime.split(':');
              const startDate = new Date(current.getFullYear(), current.getMonth(), current.getDate(), startHour, startMinute);
              const endDate = new Date(current.getFullYear(), current.getMonth(), current.getDate(), endHour, endMinute);

              if (startDate >= new Date(block.startDate) && endDate <= new Date(block.endDate)) {
                events.push({
                  id: `recurring-${block.id}-${current.toISOString()}`,
                  title: block.title,
                  start: startDate,
                  end: endDate,
                  status: 'APPROVED', // Treat recurring blocks as approved reservations
                  isBlock: true,
                  fullReservation: { ...block, user: { firstName: 'Bloqueo', lastName: 'Recurrente' } },
                });
              }
            }
            current.setDate(current.getDate() + 1);
          }
          return events;
        });
        allEvents = allEvents.concat(recurringEvents);
      }

      setEvents(allEvents);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoading(false);
    }
  }, [date, view]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad'; // Blue for approved
    if (event.isBlock) {
      backgroundColor = '#d9534f'; // Red for blocks
    } else if (event.status === 'PENDING') {
      backgroundColor = '#f0ad4e'; // Orange for pending
    } else if (event.status === 'REJECTED') {
      backgroundColor = '#d9534f'; // Red for rejected
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
              {selectedEvent.fullReservation.rejectionReason && <p><strong>Motivo del Rechazo:</strong> {selectedEvent.fullReservation.rejectionReason}</p>}
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
