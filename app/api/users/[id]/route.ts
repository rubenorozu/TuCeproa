import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { getSupabaseSession } from '@/lib/supabase/utils';

const prisma = new PrismaClient();

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { user } = await getSupabaseSession(request); // CAMBIO AQUÍ

  if (!user || user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario.' }, { status: 403 });
  }

  const userIdToDelete = params.id;

  if (user.id === userIdToDelete) {
    return NextResponse.json({ error: 'Un superusuario no puede eliminarse a sí mismo.' }, { status: 400 });
  }

  try {
    await prisma.user.delete({
      where: {
        id: userIdToDelete,
      },
    });

    return NextResponse.json({ message: 'Usuario eliminado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);
    return NextResponse.json({ error: 'No se pudo eliminar el usuario. Es posible que tenga registros asociados (como reservas) que deben ser eliminados o reasignados primero.' }, { status: 500 });
  }
}