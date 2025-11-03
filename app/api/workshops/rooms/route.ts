import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

const allowedAdminRoles: Role[] = [Role.SUPERUSER, Role.ADMIN_RESOURCE, Role.ADMIN_RESERVATION];

export async function GET() {
  const session = await getServerSession();
  if (!session || !allowedAdminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const rooms = await prisma.workshopSession.findMany({
      distinct: ['room'],
      where: {
        AND: [
          { room: { not: null } },
          { room: { not: '' } }
        ]
      },
      select: {
        room: true,
      },
      orderBy: {
        room: 'asc',
      },
    });

    // The result is an array of objects like [{ room: 'Aula 1' }, { room: 'Aula 2' }]
    // We map it to a simple array of strings: ['Aula 1', 'Aula 2']
    const roomNames = rooms.map(r => r.room);

    return NextResponse.json(roomNames);
  } catch (error) {
    console.error("Error fetching workshop rooms:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
