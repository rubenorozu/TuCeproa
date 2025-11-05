
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// POST /api/reservations/[id]/checkin
// Marks a reservation as "checked in" by a VIGILANCIA user.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  // 1. Authentication & Authorization
  const allowedRoles = [Role.SUPERUSER, Role.VIGILANCIA];
  if (!session || !allowedRoles.some(role => role === session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
  }

  try {
    // 2. Find the reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // 3. Validation
    if (!reservation.checkedOutAt) {
      return NextResponse.json({ error: 'Este equipo no puede ser marcado como devuelto porque nunca fue retirado.' }, { status: 400 });
    }

    if (reservation.checkedInAt) {
      return NextResponse.json({ error: 'Este equipo ya ha sido marcado como devuelto.' }, { status: 400 });
    }

    // 4. Update the reservation
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: {
        checkedInAt: new Date(),
        checkedInByUserId: session.user.id,
      },
    });

    return NextResponse.json(updatedReservation);
  } catch (error) {
    console.error(`Error checking in reservation ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
