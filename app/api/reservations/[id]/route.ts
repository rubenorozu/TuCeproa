import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, ReservationStatus } from '@prisma/client';

const allowedAdminRoles: Role[] = [Role.SUPERUSER, Role.ADMIN_RESOURCE, Role.ADMIN_RESERVATION];

// PATCH /api/reservations/[id]
// Updates the status of a reservation (e.g., to approve or reject it)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || !allowedAdminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !Object.values(ReservationStatus).includes(status)) {
      return NextResponse.json({ error: 'Invalid status provided' }, { status: 400 });
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedReservation);
  } catch (error) {
    console.error(`Error updating reservation ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/reservations/[id]
// Deletes a reservation or an administrative block
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || !allowedAdminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
  }

  try {
    await prisma.reservation.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 }); // No Content
  } catch (error) {
    console.error(`Error deleting reservation ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
