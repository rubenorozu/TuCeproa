
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

interface Params {
  params: { id: string };
}

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  try {
    const { id } = params;

    const workshop = await prisma.workshop.findUnique({
      where: { id },
    });

    if (!workshop) {
      return NextResponse.json({ error: 'Taller no encontrado.' }, { status: 404 });
    }

    const updatedWorkshop = await prisma.workshop.update({
      where: { id },
      data: {
        inscriptionsOpen: !workshop.inscriptionsOpen,
      },
    });

    return NextResponse.json(updatedWorkshop, { status: 200 });

  } catch (error) {
    console.error('Error al cambiar el estado de las inscripciones:', error);
    return NextResponse.json({ error: 'No se pudo cambiar el estado de las inscripciones.' }, { status: 500 });
  }
}
