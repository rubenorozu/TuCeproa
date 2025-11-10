import { Role } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // Import singleton Prisma client

// GET: Obtener un equipo por ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  const equipmentId = params.id;

  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: { images: true }, // Incluir las imágenes relacionadas
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipo no encontrado.' }, { status: 404 });
    }

    if (session.user.role === Role.ADMIN_RESOURCE && equipment.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este equipo.' }, { status: 403 });
    }

    return NextResponse.json(equipment, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el equipo:', error);
    return NextResponse.json({ error: 'No se pudo obtener el equipo.' }, { status: 500 });
  }
}

// PUT: Actualizar un equipo por ID
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  const equipmentId = params.id;

  try {
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!existingEquipment) {
      return NextResponse.json({ error: 'Equipo no encontrado.' }, { status: 404 });
    }

    if (session.user.role === Role.ADMIN_RESOURCE && existingEquipment.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este equipo.' }, { status: 403 });
    }

    const { name, description, serialNumber, fixedAssetId, images, responsibleUserId, spaceId, reservationLeadTime, isFixedToSpace } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'El nombre del equipo es obligatorio.' }, { status: 400 });
    }

    const updatedEquipment = await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        name,
        description,
        serialNumber,
        fixedAssetId,
        responsibleUserId: responsibleUserId || null,
        spaceId: spaceId || null, // Add spaceId here
        reservationLeadTime: reservationLeadTime || null, // Guardar el tiempo de antelación específico del equipo
        isFixedToSpace: isFixedToSpace ?? false, // Guardar si el equipo está fijo al espacio
        images: {
          // Eliminar imágenes existentes y crear nuevas
          deleteMany: {},
          create: images.map((img: { url: string }) => ({ url: img.url })),
        },
      },
      include: { images: true }, // Incluir las imágenes en la respuesta
    });

    return NextResponse.json(updatedEquipment, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el equipo:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as PrismaError).code === 'P2025') {
      return NextResponse.json({ error: 'Equipo no encontrado para actualizar.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'No se pudo actualizar el equipo.' }, { status: 500 });
  }
}

interface PrismaError extends Error {
  code?: string;
}

// DELETE: Eliminar un equipo por ID
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  const equipmentId = params.id;

  try {
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!existingEquipment) {
      return NextResponse.json({ error: 'Equipo no encontrado.' }, { status: 404 });
    }

    if (session.user.role === Role.ADMIN_RESOURCE && existingEquipment.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este equipo.' }, { status: 403 });
    }

    await prisma.equipment.delete({
      where: { id: equipmentId },
    });

    return NextResponse.json({ message: 'Equipo eliminado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el equipo:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as PrismaError).code === 'P2025') {
      return NextResponse.json({ error: 'Equipo no encontrado para eliminar.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'No se pudo eliminar el equipo. Es posible que tenga reservas asociadas que deben ser eliminadas o reasignadas primero.' }, { status: 500 });
  }
}