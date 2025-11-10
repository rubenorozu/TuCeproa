import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface DeleteRecurringBlockModalProps {
  show: boolean;
  handleClose: () => void;
  event: any; // CalendarEvent type
  onConfirmDelete: (actionType: 'instance' | 'all') => void;
}

const DeleteRecurringBlockModal: React.FC<DeleteRecurringBlockModalProps> = ({ show, handleClose, event, onConfirmDelete }) => {
  if (!event) return null;

  const formattedStartDate = event.start ? format(event.start, 'PPPp', { locale: es }) : 'N/A';
  const formattedEndDate = event.end ? format(event.end, 'PPPp', { locale: es }) : 'N/A';

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Eliminar Bloqueo Recurrente</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Estás a punto de eliminar una instancia o un bloque recurrente completo:</p>
        <p><strong>Título:</strong> {event.title}</p>
        <p><strong>Inicio:</strong> {formattedStartDate}</p>
        <p><strong>Fin:</strong> {formattedEndDate}</p>
        <p>Por favor, selecciona una opción:</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
        <Button variant="warning" onClick={() => onConfirmDelete('instance')}>
          Eliminar solo esta instancia
        </Button>
        <Button variant="danger" onClick={() => onConfirmDelete('all')}>
          Eliminar TODO el bloque recurrente
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteRecurringBlockModal;
