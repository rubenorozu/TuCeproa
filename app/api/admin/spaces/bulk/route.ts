import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE: Eliminar uno o varios espacios
export async function DELETE(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de IDs de espacios para eliminar.' }, { status: 400 });
    }

    // Optional: Check if the user is authorized to delete each specific space
    // For ADMIN_RESOURCE, ensure they are responsible for the space
    if (session.user.role === Role.ADMIN_RESOURCE) {
      const spacesToDelete = await prisma.space.findMany({
        where: {
          id: { in: ids },
          responsibleUserId: session.user.id,
        },
        select: { id: true },
      });

      if (spacesToDelete.length !== ids.length) {
        return NextResponse.json({ error: 'No tiene permiso para eliminar todos los espacios especificados.' }, { status: 403 });
      }
    }

    const deleteResult = await prisma.space.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({ message: `${deleteResult.count} espacio(s) eliminado(s) correctamente.` }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar espacios:', error);
    return NextResponse.json({ error: 'No se pudo eliminar el espacio.' }, { status: 500 });
  }
}
