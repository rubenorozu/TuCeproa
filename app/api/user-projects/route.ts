
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Falta el ID de usuario.' }, { status: 400 });
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
      },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error al obtener los proyectos del usuario:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los proyectos del usuario.' }, { status: 500 });
  }
}
