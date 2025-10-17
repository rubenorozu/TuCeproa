import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESERVATION && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Reservas.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const whereClause: Prisma.InscriptionWhereInput = {};

    if (session.user.role !== Role.SUPERUSER) {
      if (statusFilter && statusFilter !== 'all') {
        whereClause.status = statusFilter.toUpperCase() as InscriptionStatus;
      }
    }

    const inscriptions = await prisma.inscription.findMany({
      where: whereClause,
      include: {
        user: true,
        workshop: {
          select: {
            id: true,
            name: true,
            responsibleUserId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(inscriptions, { status: 200 });
  } catch (error) {
    console.error('Error al obtener las inscripciones:', error);
    return NextResponse.json({ error: 'No se pudieron obtener las inscripciones.' }, { status: 500 });
  }
}