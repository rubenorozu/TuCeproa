'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';

interface RecurringBlockModalProps {
  show: boolean;
  handleClose: () => void;
  onSave: () => void;
  initialData?: {
    id?: string;
    title?: string;
    description?: string | null;
    startDate?: string;
    endDate?: string;
    dayOfWeek?: number[]; // Changed to array
    startTime?: string;
    endTime?: string;
    spaceId?: string;
    equipmentId?: string;
    isVisibleToViewer?: boolean;
  };
  selectedSlot?: {
    start: Date;
    end: Date;
  };
  calendarSpaceId?: string; // New prop to pre-select space
  calendarEquipmentId?: string; // New prop to pre-select equipment
}

interface ResourceOption {
  id: string;
  name: string;
  spaceId?: string;
}

export default function RecurringBlockModal({ show, handleClose, onSave, initialData, selectedSlot, calendarSpaceId, calendarEquipmentId }: RecurringBlockModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    dayOfWeek: [] as number[], // Changed to array of numbers
    startTime: '',
    endTime: '',
    spaceId: '',
    equipmentIds: [] as string[], // Changed to array of strings for multiple equipment
    isVisibleToViewer: true,
  });
  const [spaces, setSpaces] = useState<ResourceOption[]>([]);
  const [allEquipment, setAllEquipment] = useState<ResourceOption[]>([]); // Store all equipment
  const [filteredEquipment, setFilteredEquipment] = useState<ResourceOption[]>([]); // Equipment filtered by space
  const [loadingResources, setLoadingResources] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchResources = async () => {
      setLoadingResources(true);
      try {
        const [spacesRes, equipmentRes] = await Promise.all([
          fetch('/api/admin/spaces'),
          fetch('/api/admin/equipment'),
        ]);

        if (spacesRes.ok) {
          const spacesData = await spacesRes.json();
          setSpaces(spacesData.spaces);
        }

        if (equipmentRes.ok) {
          const equipmentData = await equipmentRes.json();
          setAllEquipment(equipmentData.equipment);
          setFilteredEquipment(equipmentData.equipment); // Initially, all equipment is filtered
        }
      } catch (err: any) {
        console.error('Error al cargar espacios y equipos:', err);
        setError('Error al cargar recursos disponibles.');
      } finally {
        setLoadingResources(false);
      }
    };
    fetchResources();
  }, []);

  useEffect(() => {
    // Filter equipment based on selected space
    if (form.spaceId) {
      const spaceSpecificEquipment = allEquipment.filter(eq => eq.spaceId === form.spaceId);
      setFilteredEquipment(spaceSpecificEquipment);
      // If previously selected equipment is not in the new filtered list, clear it
      if (form.equipmentIds.some(id => !spaceSpecificEquipment.some(eq => eq.id === id))) {
        setForm(prev => ({ ...prev, equipmentIds: [] }));
      }
    } else {
      setFilteredEquipment(allEquipment); // Show all equipment if no space is selected
    }
  }, [form.spaceId, allEquipment]);

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || '',
        description: initialData.description || '',
        startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '',
        endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '',
        dayOfWeek: initialData.dayOfWeek !== undefined ? (Array.isArray(initialData.dayOfWeek) ? initialData.dayOfWeek : [initialData.dayOfWeek]) : [],
        startTime: initialData.startTime || '',
        endTime: initialData.endTime || '',
        spaceId: initialData.spaceId || '',
        equipmentIds: initialData.equipmentId ? (Array.isArray(initialData.equipmentId) ? initialData.equipmentId : [initialData.equipmentId]) : [], // Handle as array
        isVisibleToViewer: initialData.isVisibleToViewer ?? true,
      });
    } else if (selectedSlot) {
      const start = selectedSlot.start;
      const end = selectedSlot.end;
      setForm({
        title: '',
        description: '',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        startTime: start.toTimeString().slice(0, 5),
        endTime: end.toTimeString().slice(0, 5),
        dayOfWeek: [start.getDay()],
        spaceId: calendarSpaceId || '', // Pre-select from calendar props
        equipmentIds: calendarEquipmentId ? [calendarEquipmentId] : [], // Pre-select from calendar props as array
        isVisibleToViewer: true,
      });
    } else {
      setForm({
        title: '', description: '', startDate: '', endDate: '', dayOfWeek: [],
        startTime: '', endTime: '', spaceId: calendarSpaceId || '', equipmentIds: calendarEquipmentId ? [calendarEquipmentId] : [],
        isVisibleToViewer: true
      });
    }
  }, [initialData, selectedSlot, calendarSpaceId, calendarEquipmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const url = initialData?.id ? `/api/admin/recurring-blocks/${initialData.id}` : '/api/admin/recurring-blocks';
    const method = initialData?.id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No se pudo guardar el bloqueo recurrente.');
      }

      onSave();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Error desconocido al guardar el bloqueo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop={true} keyboard={true}>
      <Modal.Header closeButton>
        <Modal.Title>{initialData?.id ? 'Editar Bloqueo Recurrente' : 'Añadir Bloqueo Recurrente'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loadingResources ? (
          <div className="text-center"><Spinner animation="border" /></div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Título</Form.Label>
              <Form.Control type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required disabled={isSubmitting} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={isSubmitting} />
            </Form.Group>
            <Row className="mb-3">
              <Form.Group as={Col}>
                <Form.Label>Fecha de Inicio</Form.Label>
                <Form.Control type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required disabled={isSubmitting} />
              </Form.Group>
              <Form.Group as={Col}>
                <Form.Label>Fecha de Fin</Form.Label>
                <Form.Control type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required disabled={isSubmitting} />
              </Form.Group>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Días de la Semana</Form.Label>
              <Row>
                {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((dayName, index) => (
                  <Col xs={4} key={index}> {/* Use Col to create 3 columns */}
                    <Form.Check
                      type="checkbox"
                      id={`dayOfWeek-${index}`}
                      label={dayName}
                      value={index}
                      checked={form.dayOfWeek.includes(index)}
                      onChange={(e) => {
                        const day = parseInt(e.target.value, 10);
                        setForm(prev => ({
                          ...prev,
                          dayOfWeek: e.target.checked
                            ? [...prev.dayOfWeek, day]
                            : prev.dayOfWeek.filter(d => d !== day)
                        }));
                      }}
                      disabled={isSubmitting}
                    />
                  </Col>
                ))}
              </Row>
            </Form.Group>
            <Row className="mb-3">
              <Form.Group as={Col}>
                <Form.Label>Hora de Inicio</Form.Label>
                <Form.Control type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required disabled={isSubmitting} />
              </Form.Group>
              <Form.Group as={Col}>
                <Form.Label>Hora de Fin</Form.Label>
                <Form.Control type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required disabled={isSubmitting} />
              </Form.Group>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Espacio</Form.Label>
              <Form.Select value={form.spaceId} onChange={(e) => setForm({ ...form, spaceId: e.target.value, equipmentIds: [] })} disabled={isSubmitting}>
                <option value="">Selecciona un espacio (opcional)</option>
                {spaces.map(space => (
                  <option key={space.id} value={space.id}>{space.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Equipo(s)</Form.Label>
              {filteredEquipment.length > 0 ? (
                <>
                  <Form.Check
                    type="checkbox"
                    id="selectAllEquipment"
                    label="Seleccionar todos los equipos"
                    checked={form.equipmentIds.length === filteredEquipment.length && filteredEquipment.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm(prev => ({ ...prev, equipmentIds: filteredEquipment.map(eq => eq.id) }));
                      } else {
                        setForm(prev => ({ ...prev, equipmentIds: [] }));
                      }
                    }}
                    disabled={isSubmitting}
                    className="mb-2" // Add some bottom margin
                  />
                  <Row>
                    {filteredEquipment.map(item => (
                      <Col xs={6} key={item.id}> {/* Use Col to create 2 columns */}
                        <Form.Check
                          type="checkbox"
                          id={`equipment-${item.id}`}
                          label={item.name}
                          value={item.id}
                          checked={form.equipmentIds.includes(item.id)}
                          onChange={(e) => {
                            const eqId = e.target.value;
                            setForm(prev => ({
                              ...prev,
                              equipmentIds: e.target.checked
                                ? [...prev.equipmentIds, eqId]
                                : prev.equipmentIds.filter(id => id !== eqId)
                            }));
                          }}
                          disabled={isSubmitting}
                        />
                      </Col>
                    ))}
                  </Row>
                </>
              ) : (
                <p className="text-muted">No hay equipos disponibles para este espacio.</p>
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="isVisibleToViewer"
                label="Visible para el visor de calendarios"
                checked={form.isVisibleToViewer}
                onChange={(e) => setForm({ ...form, isVisibleToViewer: e.target.checked })}
                disabled={isSubmitting}
              />
            </Form.Group>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Bloqueo'}
            </Button>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
}
