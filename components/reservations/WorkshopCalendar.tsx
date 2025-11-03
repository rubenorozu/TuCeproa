'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, startOfDay, endOfDay, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale/es';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { locale: es }), getDay, locales });

interface WorkshopCalendarProps {
  room: string;
  teacher: string;
}

export default function WorkshopCalendar({ room, teacher }: WorkshopCalendarProps) {
  const [events, setEvents] = useState<BigCalendarEvent[]>([]);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const onNavigate = useCallback((newDate: Date) => setDate(newDate), [setDate]);
  const onView = useCallback((newView: string) => setView(newView), [setView]);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    
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

    params.append('start', viewStart.toISOString());
    params.append('end', viewEnd.toISOString());

    if (room) {
      params.append('room', room);
    }
    if (teacher) {
      params.append('teacher', teacher);
    }

    try {
      const response = await fetch(`/api/workshops/events?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // Ensure start/end are Date objects
        const formattedEvents = data.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error("Failed to fetch workshop events:", error);
    } finally {
      setIsLoading(false);
    }
  }, [room, teacher, date, view]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const { messages } = useMemo(() => ({
    messages: {
      next: "Siguiente", previous: "Anterior", today: "Hoy", month: "Mes", week: "Semana", day: "Día", agenda: "Agenda", date: "Fecha", time: "Hora", event: "Evento", noEventsInRange: "No hay eventos en este rango.", showMore: (total: number) => `+ Ver más (${total})`
    }
  }), []);

  return (
    <Calendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      style={{ height: '100%', opacity: isLoading ? 0.5 : 1 }}
      culture="es"
      messages={messages}
      onNavigate={onNavigate}
      onView={onView}
      view={view as any}
      date={date}
      min={new Date(0, 0, 0, 7, 0, 0)}
      max={new Date(0, 0, 0, 22, 0, 0)}
    />
  );
}
