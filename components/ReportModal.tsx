'use client';

import { useState, useRef, useCallback } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useSession } from '@/context/SessionContext';

interface ReportModalProps {
  show: boolean;
  handleClose: () => void;
  resourceId: string;
  resourceType: 'space' | 'equipment' | 'workshop';
}

// Debounce utility function
const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeout: NodeJS.Timeout;
  return function(this: any, ...args: any[]) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};

export default function ReportModal({ show, handleClose, resourceId, resourceType }: ReportModalProps) {
  const { user } = useSession();
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isSubmittingRef = useRef(false); // Use ref for immediate flag
  const [showOverlay, setShowOverlay] = useState(false); // State to control overlay visibility for re-render

  const submitReport = useCallback(async () => {
    if (!user) {
      setError('Debes iniciar sesión para reportar un problema.');
      return;
    }

    setError(null);
    setSuccess(null);
    isSubmittingRef.current = true; // Set ref immediately
    setShowOverlay(true); // Trigger re-render for overlay

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          resourceId,
          resourceType,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo enviar el reporte.');
      }

      setSuccess('Reporte enviado correctamente.');
      setTimeout(() => {
        handleClose();
        setSuccess(null);
        setDescription('');
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      isSubmittingRef.current = false; // Reset ref
      setShowOverlay(false); // Hide overlay
    }
  }, [description, resourceId, resourceType, user, handleClose]);

  const debouncedSubmitReport = useCallback(debounce(submitReport, 500), [submitReport]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return; // Prevent multiple submissions if ref is already true
    debouncedSubmitReport();
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop={showOverlay ? "static" : true} keyboard={!showOverlay}>
      <Modal.Header closeButton={!showOverlay}>
        <Modal.Title>Reportar un Problema</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ position: 'relative' }}>
        {showOverlay && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <Spinner animation="border" />
          </div>
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Descripción del Problema</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </Form.Group>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <Button variant="primary" type="submit" className="w-100" disabled={showOverlay}>
            {showOverlay ? 'Enviando...' : 'Enviar Reporte'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
