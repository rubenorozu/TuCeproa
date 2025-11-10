'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Badge, ListGroup, Spinner } from 'react-bootstrap';
import { useSession } from '@/context/SessionContext';

interface ReportDetailsModalProps {
  show: boolean;
  handleClose: () => void;
  reportId: string | null;
  onUpdate: () => void;
}

interface ReportDetails {
  id: string;
  reportIdCode: string; // NEW: Add reportIdCode
  description: string;
  createdAt: string;
  status: string;
  resource: {
    name: string;
  };
  user: {
    firstName:string;
    lastName: string;
  };
  comments: {
    id: string;
    text: string;
    createdAt: string;
    user: {
      firstName: string;
      lastName: string;
    };
  }[];
}

export default function ReportDetailsModal({ show, handleClose, reportId, onUpdate }: ReportDetailsModalProps) {
  const { user } = useSession();
  const [report, setReport] = useState<ReportDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    if (show && reportId) {
      const fetchReportDetails = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/admin/reports/${reportId}`);
          if (!response.ok) {
            throw new Error('Error al cargar los detalles del reporte.');
          }
          const data = await response.json();
          setReport(data);
          setNewStatus(data.status);
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
      fetchReportDetails();
    }
  }, [show, reportId]);

  const handleUpdate = async () => {
    if (!reportId) return;

    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          comment: newComment,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo actualizar el reporte.');
      }

      setNewComment('');
      onUpdate();
      handleClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'danger';
      case 'IN_PROGRESS':
        return 'warning';
      case 'RESOLVED':
        return 'success';
      default:
        return 'secondary';
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Detalles del Reporte {report ? `- ${report.reportIdCode}` : ''}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center"><Spinner animation="border" /></div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : report ? (
          <>
            <h5>{report.resource.name}</h5>
            <p><strong>Reportado por:</strong> {`${report.user.firstName} ${report.user.lastName}`}</p>
            <p><strong>Fecha:</strong> {new Date(report.createdAt).toLocaleString()}</p>
            <p><strong>Descripción:</strong> {report.description}</p>
            <p><strong>Estado:</strong> <Badge bg={getStatusVariant(report.status)}>{report.status}</Badge></p>
            <hr />
            <h6>Comentarios</h6>
            <ListGroup>
              {report.comments.map(comment => (
                <ListGroup.Item key={comment.id}>
                  <div className="d-flex justify-content-between">
                    <strong>{`${comment.user.firstName} ${comment.user.lastName}`}</strong>
                    <small>{new Date(comment.createdAt).toLocaleString()}</small>
                  </div>
                  <p>{comment.text}</p>
                </ListGroup.Item>
              ))}
            </ListGroup>
            <hr />
            <h6>Actualizar Reporte</h6>
            <Form.Group className="mb-3">
              <Form.Label>Cambiar Estado</Form.Label>
              <Form.Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="OPEN">Abierto</option>
                <option value="IN_PROGRESS">En Progreso</option>
                <option value="RESOLVED">Resuelto</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Añadir Comentario</Form.Label>
              <Form.Control as="textarea" rows={3} value={newComment} onChange={(e) => setNewComment(e.target.value)} />
            </Form.Group>
          </>
        ) : (
          <Alert variant="warning">No se encontraron detalles del reporte.</Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
        <Button variant="primary" onClick={handleUpdate} disabled={loading}>Guardar Cambios</Button>
      </Modal.Footer>
    </Modal>
  );
}
