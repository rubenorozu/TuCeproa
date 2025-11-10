
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { id } = params;
  const body = await request.json();
  const { name, description } = body;

  if (!name) {
    return NextResponse.json({ error: 'El nombre es requerido.' }, { status: 400 });
  }

  try {
    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
      },
    });
    return NextResponse.json(project);
  } catch (error) {
    console.error(`Error al actualizar el proyecto ${id}:`, error);
    return NextResponse.json({ error: `No se pudo actualizar el proyecto ${id}.` }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || session.user.role !== Role.SUPERUSER) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { id } = params;

  try {
    await prisma.project.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(`Error al eliminar el proyecto ${id}:`, error);
    return NextResponse.json({ error: `No se pudo eliminar el proyecto ${id}.` }, { status: 500 });
  }
}
