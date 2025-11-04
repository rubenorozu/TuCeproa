
import { Role, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // Import singleton Prisma client

// Helper function to generate a random alphanumeric string
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET: Listar todos los talleres
export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

    const whereClause: Prisma.WorkshopWhereInput = {};

    if (session.user.role === Role.ADMIN_RESOURCE) {
      whereClause.responsibleUserId = session.user.id;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { teacher: { contains: search, mode: 'insensitive' } },
        { displayId: { not: null, contains: search, mode: 'insensitive' } },
        {
          responsibleUser: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const skip = (page - 1) * pageSize;

    const workshops = await prisma.workshop.findMany({
      where: whereClause,
      include: {
        images: true,
        responsibleUser: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        sessions: true, // Incluir las sesiones relacionadas
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: pageSize,
    });

    const totalWorkshops = await prisma.workshop.count({ where: whereClause });

    const format = searchParams.get('format');
    if (format === 'csv') {
      const csvRows = [];
      // Headers
      csvRows.push('"ID del taller","Nombre del taller","Responsable","Maestro","Descripción","Fecha de inicio","Fecha de finalización","Sesiones"');

      for (const workshop of workshops) {
        const responsibleName = workshop.responsibleUser ? `${workshop.responsibleUser.firstName} ${workshop.responsibleUser.lastName}` : 'N/A';
        const sessions = workshop.sessions.map(session => {
          const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          return `${days[session.dayOfWeek]} ${session.timeStart}-${session.timeEnd}${session.room ? ` (${session.room})` : ''}`;
        }).join('; ');

        csvRows.push(
          `"${workshop.displayId || workshop.id}",` +
          `"${workshop.name.replace(/"/g, '""')}",` +
          `"${responsibleName.replace(/"/g, '""')}",` +
          `"${(workshop.teacher || 'N/A').replace(/"/g, '""')}",` +
          `"${(workshop.description || 'N/A').replace(/"/g, '""')}",` +
          `"${workshop.startDate ? new Date(workshop.startDate).toLocaleDateString() : 'N/A'}",` +
          `"${workshop.endDate ? new Date(workshop.endDate).toLocaleDateString() : 'N/A'}",` +
          `"${sessions.replace(/"/g, '""')}"`
        );
      }

      const csv = csvRows.join('\n');
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="talleres.csv"',
        },
      });
    }

    return NextResponse.json({ workshops, totalWorkshops }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los talleres:', error);
    return NextResponse.json({ error: 'No se pudo obtener la lista de talleres.' }, { status: 500 });
  }
}

// POST: Crear un nuevo taller
export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  try {
    const { name, description, capacity, teacher, startDate, endDate, inscriptionsStartDate, responsibleUserId, sessions, images } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'El nombre del taller es obligatorio.' }, { status: 400 });
    }

    let finalResponsibleUserId = responsibleUserId;
    if (session.user.role === Role.ADMIN_RESOURCE) {
      finalResponsibleUserId = session.user.id;
    }

    let displayId: string;
    let isUnique = false;
    do {
      const randomPart = generateRandomString(5);
      displayId = `TA_${randomPart}`;
      const existingWorkshop = await prisma.workshop.findUnique({
        where: { displayId },
      });
      if (!existingWorkshop) {
        isUnique = true;
      }
    } while (!isUnique);

    const parsedInscriptionsStartDate = inscriptionsStartDate ? new Date(inscriptionsStartDate) : null;
    const now = new Date();
    const calculatedInscriptionsOpen = parsedInscriptionsStartDate ? parsedInscriptionsStartDate <= now : true;

    const newWorkshop = await prisma.workshop.create({
      data: {
        displayId,
        name,
        description,
        capacity: capacity || 0,
        teacher,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        inscriptionsStartDate: parsedInscriptionsStartDate,
        inscriptionsOpen: calculatedInscriptionsOpen,
        images: {
          create: images, // Asume que images es un array de { url: string }
        },
        sessions: {
          create: sessions.map((session: { dayOfWeek: number; timeStart: string; timeEnd: string; room?: string }) => ({
            dayOfWeek: session.dayOfWeek,
            timeStart: session.timeStart,
            timeEnd: session.timeEnd,
            room: session.room,
          })),
        },
        responsibleUser: finalResponsibleUserId ? { connect: { id: finalResponsibleUserId } } : undefined,
      },
      include: { images: true, sessions: true },
    });

    return NextResponse.json(newWorkshop, { status: 201 });
  } catch (error) {
    console.error('Error al crear el taller:', error);
    return NextResponse.json({ error: 'No se pudo crear el taller.' }, { status: 500 });
  }
}
