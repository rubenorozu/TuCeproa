import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role, Prisma, InscriptionStatus } from '@prisma/client';

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESERVATION && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Reservas.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    const whereClause: Prisma.InscriptionWhereInput = {};

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        whereClause.status = {
          in: [InscriptionStatus.PENDING, InscriptionStatus.PENDING_EXTRAORDINARY],
        };
      } else {
        whereClause.status = statusFilter.toUpperCase() as InscriptionStatus;
      }
    }

    if (search) {
      whereClause.OR = [
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { identifier: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          workshop: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    console.log('whereClause:', JSON.stringify(whereClause, null, 2));
    const inscriptions = await prisma.inscription.findMany({
      where: whereClause,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, identifier: true } },
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

    const format = searchParams.get('format');
    if (format === 'csv') {
      const csvRows = [];
      csvRows.push('"Nombre del Usuario","Matrícula","Taller","Estatus de Inscripción"');

      for (const inscription of inscriptions) {
        const userName = `${inscription.user.firstName} ${inscription.user.lastName}`;
        const userIdentifier = inscription.user.identifier || 'N/A';
        const workshopName = inscription.workshop.name;
        const inscriptionStatus = inscription.status;

        csvRows.push(
          `"${userName.replace(/"/g, '""')}",` +
          `"${userIdentifier.replace(/"/g, '""')}",` +
          `"${workshopName.replace(/"/g, '""')}",` +
          `"${inscriptionStatus.replace(/"/g, '""')}"`
        );
      }

      const csv = csvRows.join('\n');
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="inscripciones.csv"',
        },
      });
    }

    console.log('inscriptions:', JSON.stringify(inscriptions, null, 2));
    return NextResponse.json(inscriptions, { status: 200 });
  } catch (error) {
    console.error('Error al obtener las inscripciones:', error);
    return NextResponse.json({ error: 'No se pudieron obtener las inscripciones.' }, { status: 500 });
  }
}