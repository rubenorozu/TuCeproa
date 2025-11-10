import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE: Eliminar uno o varios equipos
export async function DELETE(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de IDs de equipos para eliminar.' }, { status: 400 });
    }

    // Optional: Check if the user is authorized to delete each specific equipment
    // For ADMIN_RESOURCE, ensure they are responsible for the equipment
    if (session.user.role === Role.ADMIN_RESOURCE) {
      const equipmentToDelete = await prisma.equipment.findMany({
        where: {
          id: { in: ids },
          responsibleUserId: session.user.id,
        },
        select: { id: true },
      });

      if (equipmentToDelete.length !== ids.length) {
        return NextResponse.json({ error: 'No tiene permiso para eliminar todos los equipos especificados.' }, { status: 403 });
      }
    }

    const deleteResult = await prisma.equipment.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({ message: `${deleteResult.count} equipo(s) eliminado(s) correctamente.` }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar equipos:', error);
    return NextResponse.json({ error: 'No se pudo eliminar el equipo.' }, { status: 500 });
  }
}
