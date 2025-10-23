import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // Import singleton Prisma client

// GET: Obtener un taller por ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  const workshopId = params.id;

  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: { images: true, sessions: true },
    });

    if (!workshop) {
      return NextResponse.json({ error: 'Taller no encontrado.' }, { status: 404 });
    }

    if (session.user.role === Role.ADMIN_RESOURCE && workshop.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este taller.' }, { status: 403 });
    }

    return NextResponse.json(workshop, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el taller:', error);
    return NextResponse.json({ error: 'No se pudo obtener el taller.' }, { status: 500 });
  }
}

// PUT: Actualizar un taller existente
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { id } = params;

  try {
    const { name, description, capacity, teacher, startDate, endDate, inscriptionsStartDate, responsibleUserId, sessions, images } = await request.json();

    const existingWorkshop = await prisma.workshop.findUnique({ where: { id } });
    if (!existingWorkshop) {
      return NextResponse.json({ message: 'Taller no encontrado.' }, { status: 404 });
    }

    if (session.user.role === Role.ADMIN_RESOURCE && existingWorkshop.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este taller.' }, { status: 403 });
    }

    const parsedInscriptionsStartDate = inscriptionsStartDate ? new Date(inscriptionsStartDate) : null;
    const now = new Date();
    const calculatedInscriptionsOpen = parsedInscriptionsStartDate ? parsedInscriptionsStartDate <= now : true;

    const updatedWorkshop = await prisma.workshop.update({
      where: { id },
      data: {
        name,
        description,
        capacity: capacity || 0,
        teacher,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        inscriptionsStartDate: parsedInscriptionsStartDate,
        inscriptionsOpen: calculatedInscriptionsOpen,
        responsibleUser: responsibleUserId ? { connect: { id: responsibleUserId } } : { disconnect: true },
        images: {
          deleteMany: {},
          create: images.map((img: { url: string }) => ({ url: img.url })),
        },
        sessions: {
          deleteMany: {},
          create: sessions.map((session: { dayOfWeek: number; timeStart: string; timeEnd: string; room?: string }) => ({
            dayOfWeek: session.dayOfWeek,
            timeStart: session.timeStart,
            timeEnd: session.timeEnd,
            room: session.room,
          })),
        },
      },
      include: { images: true, sessions: true },
    });

    return NextResponse.json(updatedWorkshop, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el taller:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return NextResponse.json({ error: `No se pudo actualizar el taller: ${errorMessage}` }, { status: 500 });
  }
}

// DELETE: Eliminar un taller
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  try {
    const { id } = params;

    const existingWorkshop = await prisma.workshop.findUnique({
      where: { id },
    });

    if (!existingWorkshop) {
      return NextResponse.json({ message: 'Taller no encontrado.' }, { status: 404 });
    }

    if (session.user.role === Role.ADMIN_RESOURCE && existingWorkshop.responsibleUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado. No eres responsable de este taller.' }, { status: 403 });
    }

    // Eliminar sesiones asociadas primero
    await prisma.workshopSession.deleteMany({ where: { workshopId: id } });

    // Eliminar imágenes asociadas
    await prisma.image.deleteMany({ where: { workshopId: id } });
    
    // Eliminar el taller
    await prisma.workshop.delete({ where: { id } });

    return NextResponse.json({ message: 'Taller eliminado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el taller:', error);
    return NextResponse.json({ error: 'No se pudo eliminar el taller.' }, { status: 500 });
  }
}