
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET() {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  try {
    const projects = await prisma.project.findMany({
      include: {
        owner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error al obtener los proyectos:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los proyectos.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const body = await request.json();
  const { name, description } = body;

  if (!name) {
    return NextResponse.json({ error: 'El nombre es requerido.' }, { status: 400 });
  }

  try {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: session.user.id,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error al crear el proyecto:', error);
    return NextResponse.json({ error: 'No se pudo crear el proyecto.' }, { status: 500 });
  }
}
