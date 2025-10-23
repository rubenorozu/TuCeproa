
import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // Import singleton Prisma client

export async function GET() {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario.' }, { status: 403 });
  }

  try {
    const responsibleRoles = [Role.ADMIN_RESOURCE, Role.ADMIN_RESERVATION, Role.SUPERUSER];
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: responsibleRoles,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error('Error al obtener usuarios responsables:', error);
    return NextResponse.json({ error: 'No se pudo obtener la lista de usuarios responsables.' }, { status: 500 });
  }
}
