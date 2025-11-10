'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, startOfDay, endOfDay, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Reservation, ReservationStatus, Role } from '@prisma/client';
import { useSession } from '@/context/SessionContext';
import RecurringBlockModal from '@/components/admin/RecurringBlockModal'; // Import RecurringBlockModal
import DeleteRecurringBlockModal from '@/components/admin/DeleteRecurringBlockModal'; // NEW: Import DeleteRecurringBlockModal
import { Modal } from 'react-bootstrap'; // Import Modal for the existing selectedEvent modal

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
  fullReservation: any;
}

export default function AdminCalendar({ spaceId, equipmentId }: AdminCalendarProps) {
  const { user: currentUser } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecurringBlockModal, setShowRecurringBlockModal] = useState(false); // State for new modal
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{ start: Date; end: Date } | null>(null); // State for selected slot info
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false); // NEW: State for delete confirmation modal
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null); // NEW: Stores the event to be deleted

  const onNavigate = useCallback((newDate: Date) => setDate(newDate), [setDate]);
  const onView = useCallback((newView: string) => setView(newView), [setView]);

  const fetchEvents = useCallback(async () => {
    if (!spaceId && !equipmentId) return;
    setIsLoading(true);
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
    } else {
      viewStart = startOfWeek(date, { locale: es });
      viewEnd = endOfWeek(date, { locale: es });
    }

    try {
      const [reservationsRes, recurringBlocksRes] = await Promise.all([
        fetch(`/api/reservations?${apiQuery}&start=${viewStart.toISOString()}&end=${viewEnd.toISOString()}`),
        fetch(`/api/admin/recurring-blocks?${apiQuery}`),
      ]);

      let allEvents: CalendarEvent[] = [];
      let recurringBlocks: any[] = [];
      let exceptions: any[] = [];

      if (reservationsRes.ok) {
        const reservations = await reservationsRes.json();
        const formattedReservations: CalendarEvent[] = reservations
          .filter((res: any) => res.status !== 'REJECTED')
          .map((res: any) => ({
            id: res.id,
            title: `${res.justification} (${res.user.firstName} ${res.user.lastName})`,
            start: new Date(res.startTime),
            end: new Date(res.endTime),
            status: res.status,
            isBlock: res.subject === 'Bloqueo Administrativo',
            fullReservation: res,
          }));
        allEvents = allEvents.concat(formattedReservations);
      }

      if (recurringBlocksRes.ok) {
        recurringBlocks = await recurringBlocksRes.json();
        // Fetch exceptions for the fetched recurring blocks
        const recurringBlockIds = recurringBlocks.map(block => block.id);
        if (recurringBlockIds.length > 0) {
          const exceptionsRes = await fetch(`/api/admin/recurring-blocks/exceptions?recurringBlockIds=${recurringBlockIds.join(',')}&start=${viewStart.toISOString()}&end=${viewEnd.toISOString()}`);
          if (exceptionsRes.ok) {
            exceptions = await exceptionsRes.json();
          }
        }

        const recurringEvents = recurringBlocks.flatMap((block: any) => {
          const events: CalendarEvent[] = [];
          let current = new Date(viewStart);

          while (current <= viewEnd) {
            // Check if the current day of the week is included in the block's dayOfWeek array
            if (block.dayOfWeek.includes(current.getDay())) {
              const [startHour, startMinute] = block.startTime.split(':');
              const [endHour, endMinute] = block.endTime.split(':');
              const instanceStartDate = new Date(current.getFullYear(), current.getMonth(), current.getDate(), parseInt(startHour), parseInt(startMinute));
              const instanceEndDate = new Date(current.getFullYear(), current.getMonth(), current.getDate(), parseInt(endHour), parseInt(endMinute));

              // Ensure the event falls within the recurring block's overall start and end dates
              if (instanceStartDate >= new Date(block.startDate) && instanceEndDate <= new Date(block.endDate)) {
                // Check if this specific instance is an exception
                const isExcepted = exceptions.some(
                  (ex: any) =>
                    ex.recurringBlockId === block.id &&
                    format(new Date(ex.exceptionDate), 'yyyy-MM-dd') === format(instanceStartDate, 'yyyy-MM-dd') &&
                    ex.exceptionStartTime === format(instanceStartDate, 'HH:mm') &&
                    ex.exceptionEndTime === format(instanceEndDate, 'HH:mm')
                );

                if (!isExcepted) {
                  events.push({
                    id: `recurring-${block.id}-${instanceStartDate.toISOString()}`,
                    title: block.title,
                    start: instanceStartDate,
                    end: instanceEndDate,
                    isBlock: true,
                    fullReservation: {
                      ...block,
                      user: { firstName: 'Bloqueo', lastName: 'Recurrente' },
                      // Flatten equipment names for display if needed
                      equipmentNames: block.equipment.map((eq: any) => eq.name).join(', '),
                    },
                  });
                }
              }
            }
            current = addDays(current, 1); // Increment by one day
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
  }, [spaceId, equipmentId, date, view]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date, end: Date }) => {
      setSelectedSlotInfo({ start, end });
      setShowRecurringBlockModal(true);
    },
    []
  );

  const handleEventAction = async (action: 'APPROVE' | 'REJECT' | 'DELETE') => {
    if (!selectedEvent) return;

    const eventId = selectedEvent.id;
    let url = '';
    let method = 'POST';
    let body: any = undefined; // Moved declaration to the top

    // Check if it's a recurring block event
    const isRecurringBlockEvent = eventId.startsWith('recurring-');
    let recurringBlockId: string | null = null;
    if (isRecurringBlockEvent) {
      recurringBlockId = eventId.split('-')[1]; // Extract the actual recurringBlockId
    }

    if (action === 'APPROVE') {
      url = `/api/admin/reservations/${eventId}/approve`;
    } else if (action === 'REJECT') {
      if (!window.confirm('¿Estás seguro de que quieres rechazar esta reservación?')) {
        return;
      }
      url = `/api/admin/reservations/${eventId}/reject`;
    } else if (action === 'DELETE') {
      if (isRecurringBlockEvent && recurringBlockId && selectedEvent.start && selectedEvent.end) {
        // Instead of window.confirm, open the custom modal
        setEventToDelete(selectedEvent);
        setShowDeleteConfirmModal(true);
        return; // Exit to prevent immediate deletion
      } else { // Regular reservation deletion
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta reserva?')) {
          return;
        }
        url = `/api/reservations/${eventId}`;
        method = 'DELETE';
      }
    }

    if (!url) return;

    setIsLoading(true);

    try {
      const response = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body });
      const responseData = await response.json().catch(() => null); // Catch cases where response is not JSON

      if (response.ok) {
        alert(`¡Acción completada con éxito!`);
        setSelectedEvent(null);
        fetchEvents();
      } else {
        // Use the error message from the response, or a default one
        const errorMessage = responseData?.error || 'Ocurrió un error al procesar la solicitud.';
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error processing event action:', error);
      alert('Ocurrió un error de red o del servidor.');
    } finally {
      setIsLoading(false);
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

  let canApproveReject = false;
  if (selectedEvent && currentUser) {
    const reservation = selectedEvent.fullReservation;
    const isResponsible = (currentUser.role === Role.ADMIN_RESERVATION || currentUser.role === Role.ADMIN_RESOURCE) &&
      (reservation.space?.responsibleUserId === currentUser.id ||
       reservation.equipment?.responsibleUserId === currentUser.id);
    canApproveReject = currentUser.role === Role.SUPERUSER || isResponsible;
  }

  const handleCloseRecurringBlockModal = useCallback(() => {
    setShowRecurringBlockModal(false);
    setSelectedSlotInfo(null);
  }, []);

  const handleSaveRecurringBlock = useCallback(() => {
    fetchEvents(); // Refetch events after a recurring block is saved
    handleCloseRecurringBlockModal();
  }, [fetchEvents, handleCloseRecurringBlockModal]);

  const handleConfirmDelete = useCallback(async (actionType: 'instance' | 'all') => {
    if (!eventToDelete) return;

    const eventId = eventToDelete.id;
    // const isRecurringBlockEvent = eventId.startsWith('recurring-'); // Already checked in handleEventAction
    const recurringBlockId = eventId.split('-')[1];

    let url = '';
    let method = ''; // Method should be dynamic based on actionType
    let body: any = undefined;

    if (actionType === 'instance') {
      const exceptionDate = eventToDelete.start;
      const exceptionStartTime = format(eventToDelete.start!, 'HH:mm');
      const exceptionEndTime = format(eventToDelete.end!, 'HH:mm');

      url = `/api/admin/recurring-blocks/exceptions`;
      method = 'POST';
      body = JSON.stringify({
        recurringBlockId,
        exceptionDate,
        exceptionStartTime,
        exceptionEndTime,
      });
    } else if (actionType === 'all') {
      if (!window.confirm('¿Estás SEGURO de que quieres eliminar TODO el bloqueo recurrente? Esta acción es irreversible y eliminará todas las instancias pasadas y futuras.')) {
        setIsLoading(false);
        setEventToDelete(null);
        setShowDeleteConfirmModal(false);
        return;
      }
      url = `/api/admin/recurring-blocks/${recurringBlockId}`;
      method = 'DELETE';
    } else {
        alert('Acción de eliminación no válida.');
        setIsLoading(false);
        setEventToDelete(null);
        setShowDeleteConfirmModal(false);
        return;
    }

    setIsLoading(true);
    setShowDeleteConfirmModal(false); // Close the modal immediately after action is chosen

    try {
      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body
      });
      const responseData = await response.json().catch(() => null);

      if (response.ok) {
        alert(`¡Acción completada con éxito!`);
        setSelectedEvent(null);
        fetchEvents(); // Re-fetch events to update calendar
      } else {
        const errorMessage = responseData?.error || 'Ocurrió un error al procesar la solicitud.';
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error processing event action:', error);
      alert('Ocurrió un error de red o del servidor.');
    } finally {
      setIsLoading(false);
      setEventToDelete(null); // Clear the event to delete
    }
  }, [eventToDelete, fetchEvents]);

  const handleCloseDeleteConfirmModal = useCallback(() => {
    console.log('Closing delete confirm modal'); // Debug log
    setShowDeleteConfirmModal(false);
    setEventToDelete(null);
  }, []);

  return (
    <>
      {/* Existing selectedEvent modal for reservation details */}
      {selectedEvent && (
        <Modal show={!!selectedEvent} onHide={() => setSelectedEvent(null)}>
          <Modal.Header closeButton>
            <Modal.Title>{selectedEvent.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p><strong>Solicitante:</strong> {selectedEvent.fullReservation.user.firstName} {selectedEvent.fullReservation.user.lastName}</p>
            <p><strong>Inicio:</strong> {format(selectedEvent.start!, 'Pp', { locale: es })}</p>
            <p><strong>Fin:</strong> {format(selectedEvent.end!, 'Pp', { locale: es })}</p>
            <p><strong>Estado:</strong> {selectedEvent.status}</p>
            <p><strong>Justificación:</strong> {selectedEvent.fullReservation.justification}</p>
          </Modal.Body>
          <Modal.Footer>
            {selectedEvent.status === 'PENDING' && canApproveReject && (
              <>
                <button style={{...buttonStyle, backgroundColor: '#5cb85c'}} onClick={() => handleEventAction('APPROVE')}>Aprobar</button>
                <button style={{...buttonStyle, backgroundColor: '#f0ad4e'}} onClick={() => handleEventAction('REJECT')}>Rechazar</button>
              </>
            )}
            {canApproveReject && (
               <button style={{...buttonStyle, backgroundColor: '#d9534f'}} onClick={() => handleEventAction('DELETE')}>Eliminar</button>
            )}
            <button style={{...buttonStyle, backgroundColor: '#6c757d'}} onClick={() => setSelectedEvent(null)}>Cerrar</button>
          </Modal.Footer>
        </Modal>
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

      {/* New RecurringBlockModal */}
      <RecurringBlockModal
        show={showRecurringBlockModal}
        handleClose={handleCloseRecurringBlockModal}
        onSave={handleSaveRecurringBlock}
        selectedSlot={selectedSlotInfo}
        calendarSpaceId={spaceId} // Pass spaceId
        calendarEquipmentId={equipmentId} // Pass equipmentId
      />

      {/* NEW: DeleteRecurringBlockModal */}
      <DeleteRecurringBlockModal
        show={showDeleteConfirmModal}
        handleClose={handleCloseDeleteConfirmModal}
        event={eventToDelete}
        onConfirmDelete={handleConfirmDelete}
      />
    </>
  );
}
