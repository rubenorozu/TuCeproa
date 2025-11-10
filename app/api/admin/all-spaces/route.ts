import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession();

  // Ensure only SUPERUSER or ADMIN_RESOURCE can access this API
  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos para acceder a todos los espacios.' }, { status: 403 });
  }

  try {
    const spaces = await prisma.space.findMany({
      // We don't apply any filters here, returning all spaces.
      // This API is specifically for admin forms that need a full list of spaces.
      select: {
        id: true,
        name: true,
        // Add any other fields that the frontend might need for displaying space options,
        // but keep it minimal to optimize performance.
      },
      orderBy: {
        name: 'asc', // Order alphabetically for better user experience
      },
    });

    return NextResponse.json(spaces);
  } catch (error) {
    console.error('Error al obtener todos los espacios para administradores:', error);
    return NextResponse.json({ message: 'Error al obtener la lista completa de espacios.' }, { status: 500 });
  }
}
