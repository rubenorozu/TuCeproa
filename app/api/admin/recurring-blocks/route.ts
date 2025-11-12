
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';
import { addDays, isWithinInterval, setHours, setMinutes, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: Request) {
  const session = await getServerSession();

  const allowedRoles: Role[] = [Role.SUPERUSER, Role.ADMIN_RESOURCE, Role.ADMIN_RESERVATION, Role.CALENDAR_VIEWER];
  if (!session || !allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const spaceId = searchParams.get('spaceId');
  const equipmentId = searchParams.get('equipmentId');
  const isVisibleToViewer = searchParams.get('isVisibleToViewer');

  const whereClause: any = {};

  if (spaceId) {
    whereClause.spaceId = spaceId;
  } else if (equipmentId) {
    whereClause.equipment = { some: { equipmentId } };
  }

  if (isVisibleToViewer === 'true') {
    whereClause.isVisibleToViewer = true;
  }

  try {
    const recurringBlocks = await prisma.recurringBlock.findMany({
      where: whereClause,
      include: {
        space: { select: { name: true } },
        equipment: {
          include: {
            equipment: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    // Flatten the equipment structure for easier consumption
    const formattedRecurringBlocks = recurringBlocks.map(block => ({
      ...block,
      equipment: block.equipment.map(eq => eq.equipment),
    }));
    return NextResponse.json(formattedRecurringBlocks);
  } catch (error) {
    console.error('Error al obtener los bloqueos recurrentes:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los bloqueos recurrentes.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();

  // Only higher-level admins can create blocks
  const allowedRoles: Role[] = [Role.SUPERUSER, Role.ADMIN_RESOURCE, Role.ADMIN_RESERVATION];
  if (!session || !allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, startDate, endDate, dayOfWeek, startTime, endTime, spaceId, equipmentIds, isVisibleToViewer } = body;

  if (!title || !startDate || !endDate || !Array.isArray(dayOfWeek) || dayOfWeek.length === 0 || !startTime || !endTime) {
    return NextResponse.json({ error: 'Faltan campos requeridos o formato incorrecto para días de la semana.' }, { status: 400 });
  }

  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  try {
    // --- Conflict Checking Logic ---
    let currentDate = startOfDay(parsedStartDate);
    const finalEndDate = endOfDay(parsedEndDate);

    while (currentDate <= finalEndDate) {
      if (dayOfWeek.includes(currentDate.getDay())) {
        const instanceStart = setMinutes(setHours(currentDate, startHour), startMinute);
        const instanceEnd = setMinutes(setHours(currentDate, endHour), endMinute);

        // Check for conflicts with existing reservations for the space
        if (spaceId) {
          const conflictingSpaceReservations = await prisma.reservation.findMany({
            where: {
              spaceId: spaceId,
              status: { not: 'REJECTED' },
              AND: [
                { startTime: { lt: instanceEnd } },
                { endTime: { gt: instanceStart } },
              ],
            },
          });

          if (conflictingSpaceReservations.length > 0) {
            return NextResponse.json({ error: `Conflicto de horario con una reserva existente para el espacio en ${instanceStart.toISOString()}.` }, { status: 409 });
          }
        }

        // Check for conflicts with existing reservations for the equipment
        if (equipmentIds && equipmentIds.length > 0) {
          for (const eqId of equipmentIds) {
            const conflictingEquipmentReservations = await prisma.reservation.findMany({
              where: {
                equipmentId: eqId,
                status: { not: 'REJECTED' },
                AND: [
                  { startTime: { lt: instanceEnd } },
                  { endTime: { gt: instanceStart } },
                ],
              },
            });

            if (conflictingEquipmentReservations.length > 0) {
              return NextResponse.json({ error: `Conflicto de horario con una reserva existente para el equipo ${eqId} en ${instanceStart.toISOString()}.` }, { status: 409 });
            }
          }
        }
      }
      currentDate = addDays(currentDate, 1);
    }
    // --- End Conflict Checking Logic ---

    const recurringBlock = await prisma.recurringBlock.create({
      data: {
        title,
        description,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        dayOfWeek: dayOfWeek,
        startTime,
        endTime,
        space: spaceId ? { connect: { id: spaceId } } : undefined,
        isVisibleToViewer: isVisibleToViewer,
        equipment: {
          create: equipmentIds && equipmentIds.length > 0
            ? equipmentIds.map((eqId: string) => ({ equipmentId: eqId }))
            : [],
        },
      },
    });
    return NextResponse.json(recurringBlock, { status: 201 });
  } catch (error) {
    console.error('Error al crear el bloqueo recurrente:', error);
    return NextResponse.json({ error: 'No se pudo crear el bloqueo recurrente.' }, { status: 500 });
  }
}
