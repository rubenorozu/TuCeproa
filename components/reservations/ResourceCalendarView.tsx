'use client';

import React, { useState } from 'react';
import AdminCalendar from '@/components/reservations/AdminCalendar';
import Link from 'next/link';
import { Button } from 'react-bootstrap';
import { Role } from '@prisma/client';

interface Resource {
  id: string;
  name: string;
  responsibleUserId: string | null;
}

interface ResourceCalendarViewProps {
  resources: Resource[];
  resourceType: 'space' | 'equipment';
  role?: Role;
}

export default function ResourceCalendarView({ resources, resourceType, role }: ResourceCalendarViewProps) {
  const [selectedResourceId, setSelectedResourceId] = useState<string>(resources[0]?.id || '');

  const label = resourceType === 'space' ? 'Seleccionar Espacio' : 'Seleccionar Equipo';
  const isViewer = role === Role.CALENDAR_VIEWER;

  const selectedResource = resources.find(r => r.id === selectedResourceId);

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
        <div className="mb-3 mb-md-0">
          <label htmlFor="resource-selector" className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
          <select
            id="resource-selector"
            name="resource-selector"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
            value={selectedResourceId}
            onChange={(e) => setSelectedResourceId(e.target.value)}
            style={{ minWidth: '250px' }}
          >
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
              </option>
            ))}
          </select>
        </div>
        {!isViewer && (
          <Link href="/admin" passHref legacyBehavior>
            <Button variant="outline-secondary">
              &larr; Regresar
            </Button>
          </Link>
        )}
      </div>

      {!isViewer && (
        <p className="text-sm text-gray-600 mb-4">
          Haz clic y arrastra en un horario vacío para crear un bloqueo. Haz clic en un evento para gestionarlo.
        </p>
      )}
      
      <div style={{ height: '70vh' }}>
        {selectedResourceId ? (
          <AdminCalendar 
            key={selectedResourceId} // Add key to force re-render on resource change
            spaceId={resourceType === 'space' ? selectedResourceId : undefined}
            equipmentId={resourceType === 'equipment' ? selectedResourceId : undefined}
            role={role}
            responsibleUserId={selectedResource?.responsibleUserId || null}
          />
        ) : (
          <p>Por favor selecciona un recurso.</p>
        )}
      </div>
    </div>
  );
}