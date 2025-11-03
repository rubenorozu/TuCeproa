'use client';

import React, { useState, useEffect } from 'react';
import { Button, Form } from 'react-bootstrap';
import WorkshopCalendar from './WorkshopCalendar';
import Link from 'next/link';

export default function WorkshopCalendarView() {
  const [rooms, setRooms] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<string[]>([]);
  
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');

  // Fetch rooms and teachers for the filter dropdowns
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const roomsRes = await fetch('/api/workshops/rooms');
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          setRooms(roomsData);
        }

        const teachersRes = await fetch('/api/workshops/teachers');
        if (teachersRes.ok) {
          const teachersData = await teachersRes.json();
          setTeachers(teachersData);
        }
      } catch (error) {
        console.error("Failed to fetch filter data:", error);
      }
    };
    fetchFilters();
  }, []);

  const handleClearFilters = () => {
    setSelectedRoom('');
    setSelectedTeacher('');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="mb-4">
        <div className="d-flex flex-wrap gap-3 align-items-end">
          <Form.Group controlId="roomFilter">
            <Form.Label className="text-sm font-medium text-gray-700">Filtrar por Salón</Form.Label>
            <Form.Select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} style={{ minWidth: '200px' }}>
              <option value="">Todos los Salones</option>
              {rooms.map(room => (
                <option key={room} value={room}>{room}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="teacherFilter">
            <Form.Label className="text-sm font-medium text-gray-700">Filtrar por Profesor</Form.Label>
            <Form.Select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} style={{ minWidth: '200px' }}>
              <option value="">Todos los Profesores</option>
              {teachers.map(teacher => (
                <option key={teacher} value={teacher}>{teacher}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Button variant="outline-secondary" onClick={handleClearFilters}>
            Limpiar Filtros
          </Button>
        </div>
        <Link href="/admin" passHref legacyBehavior>
          <Button variant="outline-secondary">
            &larr; Regresar al Panel
          </Button>
        </Link>
      </div>

      <div style={{ height: '70vh' }}>
        <WorkshopCalendar 
          key={`${selectedRoom}-${selectedTeacher}`} // Force re-render when filters change
          room={selectedRoom}
          teacher={selectedTeacher}
        />
      </div>
    </div>
  );
}