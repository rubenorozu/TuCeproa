import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { id } = params;

  try {
    await prisma.recurringBlockException.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Excepción de bloqueo recurrente eliminada exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar la excepción de bloqueo recurrente:', error);
    return NextResponse.json({ error: 'No se pudo eliminar la excepción de bloqueo recurrente.' }, { status: 500 });
  }
}
