import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  const allowedRoles: Role[] = [Role.SUPERUSER, Role.ADMIN_RESOURCE, Role.ADMIN_RESERVATION];
  if (!session || !allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { id } = params;
  const body = await request.json();
  const { title, description, startDate, endDate, dayOfWeek, startTime, endTime, spaceId, equipmentIds, isVisibleToViewer } = body;

  if (!title || !startDate || !endDate || !Array.isArray(dayOfWeek) || dayOfWeek.length === 0 || !startTime || !endTime) {
    return NextResponse.json({ error: 'Faltan campos requeridos o formato incorrecto para días de la semana.' }, { status: 400 });
  }

  try {
    // Disconnect existing equipment relations
    await prisma.recurringBlockOnEquipment.deleteMany({
      where: { recurringBlockId: id },
    });

    const updatedRecurringBlock = await prisma.recurringBlock.update({
      where: { id },
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        dayOfWeek: dayOfWeek,
        startTime,
        endTime,
        space: spaceId ? { connect: { id: spaceId } } : { disconnect: true },
        isVisibleToViewer: isVisibleToViewer,
        equipment: equipmentIds && equipmentIds.length > 0
          ? { create: equipmentIds.map((eqId: string) => ({ equipmentId: eqId })) }
          : undefined,
      },
    });
    return NextResponse.json(updatedRecurringBlock);
  } catch (error) {
    console.error('Error al actualizar el bloqueo recurrente:', error);
    return NextResponse.json({ error: 'No se pudo actualizar el bloqueo recurrente.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  const allowedRoles: Role[] = [Role.SUPERUSER, Role.ADMIN_RESOURCE, Role.ADMIN_RESERVATION];
  if (!session || !allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { id } = params;

  try {
    // Delete associated equipment relations first
    await prisma.recurringBlockOnEquipment.deleteMany({
      where: { recurringBlockId: id },
    });

    await prisma.recurringBlock.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Bloqueo recurrente eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar el bloqueo recurrente:', error);
    return NextResponse.json({ error: 'No se pudo eliminar el bloqueo recurrente.' }, { status: 500 });
  }
}