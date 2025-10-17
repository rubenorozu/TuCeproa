
import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET: Obtener un espacio por ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  const spaceId = params.id;

  try {
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      return NextResponse.json({ error: 'Espacio no encontrado.' }, { status: 404 });
    }

    if (session.user.role === Role.ADMIN_RESOURCE && space.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este espacio.' }, { status: 403 });
    }

    return NextResponse.json(space, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el espacio:', error);
    return NextResponse.json({ error: 'No se pudo obtener el espacio.' }, { status: 500 });
  }
}

// PUT: Actualizar un espacio por ID
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  const spaceId = params.id;

  try {
    const existingSpace = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!existingSpace) {
      return NextResponse.json({ error: 'Espacio no encontrado.' }, { status: 404 });
    }

    if (session.user.role === Role.ADMIN_RESOURCE && existingSpace.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este espacio.' }, { status: 403 });
    }

    const { name, description, images, responsibleUserId } = await request.json(); // Añadir 'images'

    if (!name) {
      return NextResponse.json({ error: 'El nombre del espacio es obligatorio.' }, { status: 400 });
    }

    const updatedSpace = await prisma.space.update({
      where: { id: spaceId },
      data: {
        name,
        description,
        responsibleUserId: responsibleUserId || null,
        images: {
          // Eliminar imágenes existentes y crear nuevas
          deleteMany: {},
          create: images.map((img: { url: string }) => ({ url: img.url })),
        },
      },
      include: { images: true }, // Incluir las imágenes en la respuesta
    });

    return NextResponse.json(updatedSpace, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el espacio:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'P2025') {
      return NextResponse.json({ error: 'Espacio no encontrado para actualizar.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'No se pudo actualizar el espacio.' }, { status: 500 });
  }
}

// DELETE: Eliminar un espacio por ID
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  const spaceId = params.id;

  try {
    const existingSpace = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!existingSpace) {
      return NextResponse.json({ error: 'Espacio no encontrado.' }, { status: 404 });
    }

    if (session.user.role === Role.ADMIN_RESOURCE && existingSpace.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este espacio.' }, { status: 403 });
    }

    await prisma.space.delete({
      where: { id: spaceId },
    });

    return NextResponse.json({ message: 'Espacio eliminado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el espacio:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'P2025') {
      return NextResponse.json({ error: 'Espacio no encontrado para eliminar.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'No se pudo eliminar el espacio. Es posible que tenga reservas asociadas que deben ser eliminadas o reasignadas primero.' }, { status: 500 });
  }
}
