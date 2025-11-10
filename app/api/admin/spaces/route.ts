
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

// GET: Listar todos los espacios
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

    const whereClause: Prisma.SpaceWhereInput = {};

    if (session.user.role === Role.ADMIN_RESOURCE) {
      whereClause.responsibleUserId = session.user.id;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
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

    const spaces = await prisma.space.findMany({
      where: whereClause,
      include: {
        images: true,
        responsibleUser: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        requirements: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: pageSize,
    });

    const totalSpaces = await prisma.space.count({ where: whereClause });

    return NextResponse.json({ spaces, totalSpaces }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los espacios:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'No se pudo obtener la lista de espacios.', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// POST: Crear un nuevo espacio
export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session || (session.user.role !== Role.SUPERUSER && session.user.role !== Role.ADMIN_RESOURCE)) {
    return NextResponse.json({ error: 'Acceso denegado. Se requieren privilegios de Superusuario o Administrador de Recursos.' }, { status: 403 });
  }

  try {
    const { name, description, responsibleUserId, images, requirementIds, reservationLeadTime, requiresSpaceReservationWithEquipment } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'El nombre del espacio es obligatorio.' }, { status: 400 });
    }

    let finalResponsibleUserId = responsibleUserId;
    if (session.user.role === Role.ADMIN_RESOURCE) {
      finalResponsibleUserId = session.user.id;
    }

    let displayId: string;
    let isUnique = false;
    do {
      const randomPart = generateRandomString(5);
      displayId = `ES_${randomPart}`;
      const existingSpace = await prisma.space.findUnique({
        where: { displayId },
      });
      if (!existingSpace) {
        isUnique = true;
      }
    } while (!isUnique);

    const newSpace = await prisma.space.create({
      data: {
        displayId,
        name,
        description,
        ...(finalResponsibleUserId && {
          responsibleUser: {
            connect: { id: finalResponsibleUserId }
          }
        }),
        reservationLeadTime: reservationLeadTime || null, // Guardar el tiempo de antelación específico del espacio
        requiresSpaceReservationWithEquipment: requiresSpaceReservationWithEquipment ?? false, // Guardar si el espacio requiere reserva con equipo
        images: {
          create: images, // Prisma creará las imágenes y las conectará
        },
        ...(requirementIds && requirementIds.length > 0 && {
          requirements: {
            connect: requirementIds.map((id: string) => ({ id }))
          }
        })
      },
      include: { images: true, requirements: true },
    });

    return NextResponse.json(newSpace, { status: 201 });
  } catch (error) {
    console.error('Error al crear el espacio:', error);
    return NextResponse.json({ error: 'No se pudo crear el espacio.' }, { status: 500 });
  }
}
