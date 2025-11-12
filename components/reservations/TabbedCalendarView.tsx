'use client';

import React, { useState } from 'react';
import { Space, Equipment, Role } from '@prisma/client';
import ResourceCalendarView from '@/components/reservations/ResourceCalendarView';
import WorkshopCalendarView from '@/components/reservations/WorkshopCalendarView';
import { Button, Nav } from 'react-bootstrap';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';

interface TabbedCalendarViewProps {
  spaces: Space[];
  equipment: Equipment[];
}

export default function TabbedCalendarView({ spaces, equipment }: TabbedCalendarViewProps) {
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState<'spaces' | 'equipment' | 'workshops'>('spaces');

  // Simplified view for CALENDAR_VIEWER role
  if (user?.role === Role.CALENDAR_VIEWER) {
    return (
      <div className="container mx-auto p-4" style={{ marginTop: '3rem' }}>
        <h2 className="text-2xl font-bold mb-4">Calendario de Espacios</h2>
        <ResourceCalendarView resources={spaces} resourceType="space" role={user.role} />
      </div>
    );
  }

  // Full view for other admin roles
  return (
    <div className="container mx-auto p-4" style={{ marginTop: '3rem' }}>

      <Nav variant="tabs" defaultActiveKey="spaces" onSelect={(k) => setActiveTab(k as any)} className="mb-3">
        <Nav.Item>
          <Nav.Link eventKey="spaces">Espacios</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="equipment">Equipos</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="workshops">Talleres</Nav.Link>
        </Nav.Item>
      </Nav>

      {activeTab === 'spaces' && (
        <ResourceCalendarView resources={spaces} resourceType="space" />
      )}
      {activeTab === 'equipment' && (
        <ResourceCalendarView resources={equipment} resourceType="equipment" />
      )}
      {activeTab === 'workshops' && (
        <WorkshopCalendarView />
      )}
    </div>
  );
}
