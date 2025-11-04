import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

const allowedAdminRoles: Role[] = [Role.SUPERUSER, Role.ADMIN_RESOURCE, Role.ADMIN_RESERVATION];

// GET /api/reservations
export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session || !allowedAdminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const spaceId = searchParams.get('spaceId');
  const equipmentId = searchParams.get('equipmentId');

  if (!start || !end) {
    return NextResponse.json({ error: 'Missing start or end date' }, { status: 400 });
  }

  if (!spaceId && !equipmentId) {
    return NextResponse.json({ error: 'Missing spaceId or equipmentId' }, { status: 400 });
  }

  const whereClause: any = {
    status: { in: ['APPROVED', 'PENDING'] },
    startTime: { gte: new Date(start) },
    endTime: { lte: new Date(end) },
  };

  if (spaceId) {
    whereClause.spaceId = spaceId;
  } else if (equipmentId) {
    whereClause.equipmentId = equipmentId;
  }

  try {
    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        space: {
          select: {
            responsibleUserId: true,
          },
        },
        equipment: {
          select: {
            responsibleUserId: true,
          },
        },
      },
    });
    return NextResponse.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/reservations
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session || !allowedAdminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { start, end, title, spaceId, equipmentId } = body;

    if (!start || !end || !title || (!spaceId && !equipmentId)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Authorization check for ADMIN_RESOURCE and ADMIN_RESERVATION roles
    if (session.user.role === Role.ADMIN_RESOURCE || session.user.role === Role.ADMIN_RESERVATION) {
      let resource;
      if (spaceId) {
        resource = await prisma.space.findUnique({ where: { id: spaceId } });
      } else if (equipmentId) {
        resource = await prisma.equipment.findUnique({ where: { id: equipmentId } });
      }

      if (!resource || resource.responsibleUserId !== session.user.id) {
        return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este recurso.' }, { status: 403 });
      }
    }

    const data: any = {
      startTime: new Date(start),
      endTime: new Date(end),
      justification: title,
      status: 'APPROVED',
      userId: session.user.id,
      subject: 'Bloqueo Administrativo',
    };

    if (spaceId) {
      data.spaceId = spaceId;
    } else if (equipmentId) {
      data.equipmentId = equipmentId;
    }

    const newBlock = await prisma.reservation.create({ data });

    return NextResponse.json(newBlock, { status: 201 });
  } catch (error) {
    console.error("Error creating block:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
