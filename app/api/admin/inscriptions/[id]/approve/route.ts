import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role, InscriptionStatus } from '@prisma/client';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESERVATION && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario, Administrador de Reservas o Administrador de Recursos.' }, { status: 403 });
  }

  const inscriptionId = params.id;

  try {
    const inscription = await prisma.inscription.findUnique({
      where: { id: inscriptionId },
      include: { workshop: { select: { responsibleUserId: true } } },
    });

    if (!inscription) {
      return NextResponse.json({ error: 'Inscripción no encontrada.' }, { status: 404 });
    }

    if (session.user.role !== Role.SUPERUSER && inscription.workshop.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'No tienes permisos para aprobar esta inscripción.' }, { status: 403 });
    }
    const updatedInscription = await prisma.inscription.update({
      where: { id: inscriptionId },
      data: {
        status: InscriptionStatus.APPROVED,
      },
      include: {
        workshop: {
          select: { name: true },
        },
      },
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        recipientId: updatedInscription.userId,
        message: `Tu inscripción al taller "${updatedInscription.workshop.name}" ha sido aprobada.`,
      },
    });

    return NextResponse.json(updatedInscription, { status: 200 });
  } catch (error) {
    console.error('Error al aprobar la inscripción:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as PrismaError).code === 'P2025') {
      return NextResponse.json({ error: 'Inscripción no encontrada para aprobar.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'No se pudo aprobar la inscripción.' }, { status: 500 });
  }
}