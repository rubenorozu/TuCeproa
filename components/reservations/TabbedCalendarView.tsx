'use client';

import React, { useState } from 'react';
import { Space, Equipment } from '@prisma/client';
import ResourceCalendarView from '@/components/reservations/ResourceCalendarView';
import { Button, Nav } from 'react-bootstrap';
import Link from 'next/link';

interface TabbedCalendarViewProps {
  spaces: Space[];
  equipment: Equipment[];
}

export default function TabbedCalendarView({ spaces, equipment }: TabbedCalendarViewProps) {
  const [activeTab, setActiveTab] = useState<'spaces' | 'equipment'>('spaces');

  return (
    <div className="container mx-auto p-4" style={{ marginTop: '3rem' }}>

      <Nav variant="tabs" defaultActiveKey="spaces" onSelect={(k) => setActiveTab(k as any)} className="mb-3">
        <Nav.Item>
          <Nav.Link eventKey="spaces">Espacios</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="equipment">Equipos</Nav.Link>
        </Nav.Item>
      </Nav>

      {activeTab === 'spaces' && (
        <ResourceCalendarView resources={spaces} resourceType="space" />
      )}
      {activeTab === 'equipment' && (
        <ResourceCalendarView resources={equipment} resourceType="equipment" />
      )}
    </div>
  );
}