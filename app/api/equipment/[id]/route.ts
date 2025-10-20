
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params; // CORREGIDO: params es un objeto directo

  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        displayId: true,
        images: true,
        responsibleUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ message: 'Equipo no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(equipment);
  } catch (error: unknown) {
    console.error('Error al obtener detalles del equipo:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ message: 'Algo salió mal al obtener el equipo.' }, { status: 500 });
  }
}
