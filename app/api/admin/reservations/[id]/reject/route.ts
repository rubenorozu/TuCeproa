import { Role, ReservationStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // Import singleton Prisma client

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESERVATION && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Reservas.' }, { status: 403 });
  }

  const reservationId = params.id;
  const { rejectionReason } = await request.json();

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
        status: ReservationStatus.REJECTED,
        rejectionReason: rejectionReason, // Guardar el motivo del rechazo
        approvedByUserId: session.user.id, // Registrar quién rechazó
      },
      include: {
        space: { select: { name: true } },
        equipment: { select: { name: true } },
      }
    });

    const resourceName = updatedReservation.space?.name || updatedReservation.equipment?.name || 'recurso';

    const notificationMessage = rejectionReason
      ? `Tu reservación para ${resourceName} ha sido rechazada. Motivo: ${rejectionReason}`
      : `Tu reservación para ${resourceName} ha sido rechazada.`;

    // Create notification for the user
    await prisma.notification.create({
      data: {
        recipientId: updatedReservation.userId,
        message: notificationMessage,
      },
    });

    return NextResponse.json(updatedReservation, { status: 200 });
  } catch (error) {
    console.error('Error al rechazar la reservación:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as PrismaClientKnownRequestError).code === 'P2025') {
      return NextResponse.json({ error: 'Reservación no encontrada para rechazar.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'No se pudo rechazar la reservación.' }, { status: 500 });
  }
}
