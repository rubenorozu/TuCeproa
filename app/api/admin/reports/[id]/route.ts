import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || (session.user.role !== 'SUPERUSER' && session.user.role !== 'ADMIN_RESOURCE')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        description: true,
        createdAt: true,
        status: true,
        space: {
          select: {
            name: true,
          },
        },
        equipment: {
          select: {
            name: true,
          },
        },
        workshop: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        comments: {
          select: {
            id: true,
            text: true,
            createdAt: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }

    const formattedReport = {
      ...report,
      resource: report.space || report.equipment || report.workshop,
    };

    return NextResponse.json(formattedReport);
  } catch (error) {
    console.error(`Error al obtener el reporte ${params.id}:`, error);
    return NextResponse.json({ error: `No se pudo obtener el reporte ${params.id}.` }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || (session.user.role !== 'SUPERUSER' && session.user.role !== 'ADMIN_RESOURCE')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { status, comment, userId } = await request.json();

    const updateData: any = {};
    if (status) {
      updateData.status = status;
    }

    if (comment && userId) {
      updateData.comments = {
        create: {
          text: comment,
          userId,
        },
      };
    }

    const updatedReport = await prisma.report.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error(`Error al actualizar el reporte ${params.id}:`, error);
    return NextResponse.json({ error: `No se pudo actualizar el reporte ${params.id}.` }, { status: 500 });
  }
}
