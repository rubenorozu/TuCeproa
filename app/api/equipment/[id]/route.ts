
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params; // CORREGIDO: params es un objeto directo

  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: { images: true }, // CORREGIDO: Incluir imágenes en lugar de imageUrl
    });

    if (!equipment) {
      return NextResponse.json({ message: 'Equipo no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(equipment);
  } catch (error: any) {
    console.error('Error al obtener detalles del equipo:', error.message);
    return NextResponse.json({ message: 'Algo salió mal al obtener el equipo.' }, { status: 500 });
  }
}
