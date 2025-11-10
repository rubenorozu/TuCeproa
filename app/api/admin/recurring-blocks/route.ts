
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';
import { addDays, isWithinInterval, setHours, setMinutes, startOfDay, endOfDay } from 'date-fns';

export async function GET() {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  try {
    const recurringBlocks = await prisma.recurringBlock.findMany({
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

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, startDate, endDate, dayOfWeek, startTime, endTime, spaceId, equipmentIds } = body;

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
        spaceId: spaceId || null,
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
