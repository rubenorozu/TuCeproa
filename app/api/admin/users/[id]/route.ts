
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || session.user.role !== 'SUPERUSER') {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  try {
    const { id } = params;
    const { role } = await req.json();

    // Optional: Validate that the role is a valid enum value
    if (!Object.values(Role).includes(role)) {
        return NextResponse.json({ message: 'Rol inválido.' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error al actualizar el rol del usuario:', error);
    return NextResponse.json({ message: 'Algo salió mal al actualizar el rol.' }, { status: 500 });
  }
}
