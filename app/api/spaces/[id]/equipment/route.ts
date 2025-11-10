import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'ID de espacio es requerido.' }, { status: 400 });
    }

    const equipment = await prisma.equipment.findMany({
      where: {
        spaceId: id,
        // Only show available equipment for user selection
        status: 'AVAILABLE',
      },
      select: {
        id: true,
        name: true,
        description: true,
        displayId: true,
        images: true,
        reservationLeadTime: true,
        isFixedToSpace: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Error al obtener equipos por espacio:', error);
    return NextResponse.json({ message: 'Error al obtener la lista de equipos para el espacio.' }, { status: 500 });
  }
}
