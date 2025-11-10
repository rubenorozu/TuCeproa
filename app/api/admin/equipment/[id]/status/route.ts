
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { status } = await request.json();
    const { id } = params;

    if (!status) {
      return NextResponse.json({ error: 'Falta el estado' }, { status: 400 });
    }

    const updatedEquipment = await prisma.equipment.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedEquipment, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el estado del equipo:', error);
    return NextResponse.json({ error: 'No se pudo actualizar el estado del equipo' }, { status: 500 });
  }
}
