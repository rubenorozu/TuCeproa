import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE: Eliminar uno o varios talleres
export async function DELETE(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de IDs de talleres para eliminar.' }, { status: 400 });
    }

    // Optional: Check if the user is authorized to delete each specific workshop
    // For ADMIN_RESOURCE, ensure they are responsible for the workshop
    if (session.user.role === Role.ADMIN_RESOURCE) {
      const workshopsToDelete = await prisma.workshop.findMany({
        where: {
          id: { in: ids },
          responsibleUserId: session.user.id,
        },
        select: { id: true },
      });

      if (workshopsToDelete.length !== ids.length) {
        return NextResponse.json({ error: 'No tiene permiso para eliminar todos los talleres especificados.' }, { status: 403 });
      }
    }

    // Delete related WorkshopSession records first to satisfy foreign key constraint
    await prisma.workshopSession.deleteMany({
      where: {
        workshopId: { in: ids },
      },
    });

    const deleteResult = await prisma.workshop.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({ message: `${deleteResult.count} taller(es) eliminado(s) correctamente.` }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar talleres:', error);
    return NextResponse.json({ error: 'No se pudo eliminar el taller.' }, { status: 500 });
  }
}
