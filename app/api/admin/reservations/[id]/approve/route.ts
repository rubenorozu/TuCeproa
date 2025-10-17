import { NextResponse } from 'next/server';
import { PrismaClient, Role, ReservationStatus } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESERVATION && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Reservas.' }, { status: 403 });
  }

  const reservationId = params.id;

  try {
    // Fetch the reservation to check responsibility if the user is ADMIN_RESERVATION
    const existingReservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        space: {
          select: { responsibleUserId: true }
        },
        equipment: {
          select: { responsibleUserId: true }
        }
      }
    });

    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservación no encontrada.' }, { status: 404 });
    }

    // If ADMIN_RESERVATION, check if they are responsible for the resource
    if (session.user.role === Role.ADMIN_RESERVATION) {
      const responsibleUserId = existingReservation.space?.responsibleUserId || existingReservation.equipment?.responsibleUserId;
      if (!responsibleUserId || responsibleUserId !== session.user.id) {
        return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este recurso.' }, { status: 403 });
      }
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.APPROVED,
        approvedByUserId: session.user.id, // Registrar quién aprobó
      },
      include: {
        space: { select: { name: true } },
        equipment: { select: { name: true } },
      }
    });

    const resourceName = updatedReservation.space?.name || updatedReservation.equipment?.name || 'recurso';

    // Create notification for the user
    await prisma.notification.create({
      data: {
        recipientId: updatedReservation.userId,
        message: `Tu reservación para ${resourceName} ha sido aprobada.`,
      },
    });

    return NextResponse.json(updatedReservation, { status: 200 });
  } catch (error) {
    console.error('Error al aprobar la reservación:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as PrismaError).code === 'P2025') {
      return NextResponse.json({ error: 'Reservación no encontrada para aprobar.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'No se pudo aprobar la reservación.' }, { status: 500 });
  }
}
