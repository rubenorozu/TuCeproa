import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';
import { eachDayOfInterval, getDay, parseISO } from 'date-fns';

const allowedAdminRoles: Role[] = [Role.SUPERUSER, Role.ADMIN_RESOURCE, Role.ADMIN_RESERVATION];

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session || !allowedAdminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const room = searchParams.get('room');
  const teacher = searchParams.get('teacher');

  if (!start || !end) {
    return NextResponse.json({ error: 'Missing start or end date' }, { status: 400 });
  }

  try {
    const startDate = parseISO(start);
    const endDate = parseISO(end);

    // Build dynamic where clauses
    const workshopWhere: any = {
      endDate: { gte: startDate },
      startDate: { lte: endDate },
    };
    if (teacher) {
      workshopWhere.teacher = teacher;
    }

    const sessionWhere: any = {};
    if (room) {
      sessionWhere.room = room;
    }

    // Fetch workshops with their sessions based on filters
    const workshops = await prisma.workshop.findMany({
      where: workshopWhere,
      include: {
        sessions: {
          where: sessionWhere,
        },
      },
    });

    const events: any[] = [];
    const interval = eachDayOfInterval({ start: startDate, end: endDate });

    // Iterate over each day in the requested interval
    for (const day of interval) {
      const dayOfWeek = getDay(day); // Sunday=0, Monday=1, etc.

      // For each workshop, check if it has a session on this day
      for (const workshop of workshops) {
        // Check if the current day is within the workshop's global start/end dates
        if (workshop.startDate && workshop.endDate && (day < workshop.startDate || day > workshop.endDate)) {
          continue;
        }

        for (const session of workshop.sessions) {
          if (session.dayOfWeek === dayOfWeek) {
            const [startHour, startMinute] = session.timeStart.split(':').map(Number);
            const [endHour, endMinute] = session.timeEnd.split(':').map(Number);

            const eventStart = new Date(day);
            eventStart.setHours(startHour, startMinute, 0, 0);

            const eventEnd = new Date(day);
            eventEnd.setHours(endHour, endMinute, 0, 0);

            events.push({
              title: `${workshop.name} (${workshop.teacher})`,
              start: eventStart,
              end: eventEnd,
              resource: { 
                workshopId: workshop.id,
                room: session.room 
              },
            });
          }
        }
      }
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching workshop events:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
