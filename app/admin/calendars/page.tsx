import React from 'react';
import { prisma } from '@/lib/prisma';
import TabbedCalendarView from '@/components/reservations/TabbedCalendarView';

export default async function CalendarsPage() {
  const spaces = await prisma.space.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  const equipment = await prisma.equipment.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return <TabbedCalendarView spaces={spaces} equipment={equipment} />;
}
